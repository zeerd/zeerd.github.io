---
layout: post
title: 在进程崩溃退出前输出所有DLT LOG
tag: [GENIVI,Automotive-DLT,DLT]
---

dlt提供了一个函数叫做dlt_user_atexit_blow_out_user_buffer()。这个函数的解释如下：
Try to resend log message in the user buffer. Stops if the dlt_uptime is bigger than dlt_uptime() + DLT_USER_ATEXIT_RESEND_BUFFER_EXIT_TIMEOUT. A pause between the resending attempts can be defined with DLT_USER_ATEXIT_RESEND_BUFFER_SLEEP.

虽然其中的DLT_USER_ATEXIT_RESEND_BUFFER_EXIT_TIMEOUT对应的变量可以通过dlt_set_resend_timeout_atexit()函数进行修改，但是程序崩溃前残余的LOG需要多久才可以输出完并不是可控的。

因此，我想了下面的办法来确保LOG的完全输出。
<!--break-->

```c
/*
    $CC dlt-offline-on-crash.c -o dlt-offline-on-crash \
        `pkg-config automotive-dlt --libs --cflags` \
        -ldl -rdynamic -O0 -g
*/

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>

#include <dlfcn.h>
#include <execinfo.h>

#include <dlt/dlt.h>

DLT_DECLARE_CONTEXT(dlt);

static const char *words[] = {
    "I remember when we used to sit",
    "In the government yard in Trench town",
    "observing the hypocrites",
    "As they would mingle with the good people we meet",
    "Good friends we have had, oh good friends we've lost along the way",
    "In this bright future you can't forget your past",
    "So dry your tears I say"
};
static int wordcnt = sizeof(words)/sizeof(words[0]);

#define CNT  (5000)

static void print_backtrace(int s)
{
    void *buffer[32];
    int i, count;
    Dl_info info;

    DLT_LOG(dlt, DLT_LOG_ERROR, DLT_STRING("caught signal"), DLT_INT(s));
    count = backtrace(buffer, sizeof(buffer)/sizeof(buffer[0]));
    for (i = 0; i < count; i++) {
        dladdr(buffer[i], &info);
        DLT_LOG(dlt, DLT_LOG_ERROR,
            DLT_INT(count - i),
            DLT_STRING(":"),
            DLT_HEX64((long) buffer[i]),
            DLT_STRING(info.dli_sname ? info.dli_sname : "--"),
            DLT_STRING(info.dli_fname));
    }
}

static void on_caught_signal(int s, siginfo_t *siginfo, void *context)
{
    fprintf(stderr,
        "caught signal %d, waiting for finish the dlt log sending.\n", s);

    print_backtrace(s);

    while(dlt_user_atexit_blow_out_user_buffer() > 0) {
        usleep(1);
    }

    DLT_UNREGISTER_CONTEXT(dlt);
    DLT_UNREGISTER_APP();

    raise(s);
}

static void catch_signals(void)
{
    struct sigaction action;

    action.sa_flags = SA_SIGINFO | SA_RESETHAND;
    action.sa_sigaction = on_caught_signal;

    sigemptyset(&action.sa_mask);
    sigaction(SIGSEGV, &action, NULL);
    sigaction(SIGABRT, &action, NULL);
    sigaction(SIGHUP,  &action, NULL);
}

int main(int argc, const char* argv[])
{
    int cnt = CNT;
    int slp = 1;
    int sgv = 1;

    printf(
        "\nUsage:\n\t%s [log-count] [sleep-usec] [crash]\n"
        "Example:\n\t%s 5000 100 1\n"
        "Default:\n\t%s %d %d %d\n\n",
        argv[0], argv[0],
        argv[0], cnt, slp, sgv);

    if(argc >= 2) {
        cnt = atoi(argv[1]);
    }
    if(argc >= 3) {
        slp = atoi(argv[2]);
    }
    if(argc >= 4) {
        sgv = atoi(argv[3]);
    }

    catch_signals();

    DLT_REGISTER_APP("TAPP", "Test Application for Logging");
    DLT_REGISTER_CONTEXT(dlt, "TEST", "Test Context for Logging");

    int i=0;
    for(i=0;i<cnt;i++) {

        usleep(slp);
        DLT_LOG(dlt, DLT_LOG_INFO,
            DLT_STRING(words[i%wordcnt]),
            DLT_INT(i));
    }

    if(sgv) {
        printf("%s %d\n", words[i%wordcnt], i);
        char *p = NULL;
        *p = '.';
    }

    DLT_UNREGISTER_CONTEXT(dlt);
    DLT_UNREGISTER_APP();

    return 0;
}
```
