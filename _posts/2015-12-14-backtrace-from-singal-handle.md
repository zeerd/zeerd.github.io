---
layout: post
title: 通过截取signal输出程序崩溃时的backtrace
tag: [Debug,Backtrace]
categories: [Program]
---
主要是参考了Android的实现方法。做成了一个简单的lib库。
<!--break-->

如下所示：

lib.c

```cpp
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <signal.h>

#include <sys/types.h>
#include <sys/prctl.h>
#include <sys/syscall.h>

#include <unistd.h>

#include <execinfo.h>

#define ALOGE(...) ((void)fprintf(stderr, __VA_ARGS__))

#define BT_DEPTH 30

static void dbg_signal_handler(int n, siginfo_t* info, void* unused)
{

    char threadname[1024 + 1]; // one more for termination
    char* signame;
    switch (n) {
        case SIGILL:    signame = "SIGILL";     break;
        case SIGABRT:   signame = "SIGABRT";    break;
        case SIGBUS:    signame = "SIGBUS";     break;
        case SIGFPE:    signame = "SIGFPE";     break;
        case SIGSEGV:   signame = "SIGSEGV";    break;
        case SIGSTKFLT: signame = "SIGSTKFLT";  break;
        case SIGPIPE:   signame = "SIGPIPE";    break;
        default:        signame = "???";        break;
    }

    if (prctl(PR_GET_NAME, (unsigned long)threadname, 0, 0, 0) != 0) {
        strcpy(threadname, "<name unknown>");
    } else {
        // short names are null terminated by prctl, but the manpage
        // implies that 16 byte names are not.
        threadname[1024] = 0;
    }

    ALOGE(
        "[LIB] Fatal signal %d (%s) at %p (code=%d), thread %ld (%s)\n",
        n, signame, info->si_addr, info->si_code, syscall(SYS_gettid), threadname);


    void * _array[BT_DEPTH];
    size_t _size;
    char ** _strings;
    int i;

    _size = backtrace(_array, BT_DEPTH);
    _strings = backtrace_symbols(_array, _size);

    if(_strings != NULL) {

        ALOGE("[LIB] stack depth %ld\n", _size);
        for(i = 0; i < _size; i ++) {
            ALOGE("[LIB] %s\n", _strings[i]);
        }

        free(_strings);
    }

    /* remove our net so we fault for real when we return */
    signal(n, SIG_DFL);

    /*
     * These signals are not re-thrown when we resume.  This means that
     * crashing due to (say) SIGPIPE doesn't work the way you'd expect it
     * to.  We work around this by throwing them manually.  We don't want
     * to do this for *all* signals because it'll screw up the address for
     * faults like SIGSEGV.
     */
    switch (n) {
        case SIGABRT:
        case SIGFPE:
        case SIGPIPE:
        case SIGSTKFLT:
            (void) syscall(SYS_tgkill, getpid(), syscall(SYS_gettid), n);
            break;
        default:    // SIGILL, SIGBUS, SIGSEGV
            break;
    }
}

void dbg_init(void)
{
    struct sigaction act;
    memset(&act, 0, sizeof(act));
    act.sa_sigaction = dbg_signal_handler;
    act.sa_flags = SA_RESTART | SA_SIGINFO;
    sigemptyset(&act.sa_mask);
    sigaction(SIGILL, &act, NULL);
    sigaction(SIGABRT, &act, NULL);
    sigaction(SIGBUS, &act, NULL);
    sigaction(SIGFPE, &act, NULL);
    sigaction(SIGSEGV, &act, NULL);
    sigaction(SIGSTKFLT, &act, NULL);
    sigaction(SIGPIPE, &act, NULL);
}
```
 

然后，每次做成可执行文件时，在main函数的最开始调用dbg_init()函数，加入backtrace输出功能。

crash.c

```cpp
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern void dbg_init(void);

int *d = (int*)1;

int c(void)
{
    return *d;
}

int b(void)
{
    return c();
}

int a(void)
{
    return b();
}

int main(int argc, char *argv[])
{
    dbg_init();

    printf("[TEST] pid = %d\n", getpid());

    return a();
}
```

执行的效果如下：

```
root@ubuntu:~/codes/dbg# LD_LIBRARY_PATH=. ./crash
[TEST] pid = 24362
[LIB] Fatal signal 11 (SIGSEGV) at 0x1 (code=1), thread 24362 (crash)
[LIB] stack depth 8
[LIB] ./libdbg.so(+0xbfc) [0x7fd4c2560bfc]
[LIB] /lib/x86_64-linux-gnu/libc.so.6(+0x370b0) [0x7fd4c21ce0b0]
[LIB] ./crash(c+0xb) [0x4008b7]
[LIB] ./crash(b+0x9) [0x4008c4]
[LIB] ./crash(a+0x9) [0x4008cf]
[LIB] ./crash(main+0x34) [0x400905]
[LIB] /lib/x86_64-linux-gnu/libc.so.6(__libc_start_main+0xf5) [0x7fd4c21b8ea5]
[LIB] ./crash() [0x4007e9]
Segmentation fault
```

而且，由于在lib库中，dbg_signal_handler()函数的最后，将signal的钩子还原了。当这个程序作为其他程序的子进程启动时，父进程还是可以接收到正常的signal信息。

main.c

```cpp
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <errno.h>
#include <unistd.h>
#include <signal.h>

#include <sys/types.h>

static int quit = 0;

static void sig_chld( int signo )
{

    pid_t id;
    int stat;
    id = wait(&stat);

    printf("[MAIN] caught signal %d for pid(%d).\n", (WIFSIGNALED(stat) ? WTERMSIG(stat) : -1), id);

    quit = -1;

    return;
}

int main(int argc, char *argv[])
{
    signal(SIGCHLD, sig_chld);

    if(fork() == 0){

        char * const cmds[] = {
            [0] = argv[1],
            [1] = NULL
        };

        execv(cmds[0], cmds);
    }

    while(!quit) {usleep(100);}

    return 0;
}
```
 

最后，提供一下Makefile文件，说明一下依赖的编译参数。其中需要注意的是，可执行程序编译时必须附带“-rdynamic”参数。

```makefile
all: crash main

lib:
    @gcc lib.c -o libdbg.so -O0 -g -shared -fPIC

crash: lib
    @gcc crash.c -o crash -O0 -g -rdynamic -ldbg -L.

main:
    @gcc main.c -o main -O0 -g

test: all
    @LD_LIBRARY_PATH=. ./main ./crash

clean:
    @-rm crash main libdbg.so core
```

执行的测试结果：

```
root@ubuntu:~/codes/dbg# make test
[TEST] pid = 24401
[LIB] Fatal signal 11 (SIGSEGV) at 0x1 (code=1), thread 24401 (crash)
[LIB] stack depth 8
[LIB] ./libdbg.so(+0xbfc) [0x2b582e3c0bfc]
[LIB] /lib/x86_64-linux-gnu/libc.so.6(+0x370b0) [0x2b582e6090b0]
[LIB] ./crash(c+0xb) [0x4008b7]
[LIB] ./crash(b+0x9) [0x4008c4]
[LIB] ./crash(a+0x9) [0x4008cf]
[LIB] ./crash(main+0x34) [0x400905]
[LIB] /lib/x86_64-linux-gnu/libc.so.6(__libc_start_main+0xf5) [0x2b582e5f3ea5]
[LIB] ./crash() [0x4007e9]
[MAIN] caught signal 11 for pid(24401).
```
