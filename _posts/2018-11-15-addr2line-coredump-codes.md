---
layout: post
title: 使用addr2line工具在不方便生成coredump的系统中追溯应用程序崩溃记录
tag: [Linux, Coredump]
---

很多时候，出于各种原因，我们需要在Linux系统发行时关掉coredump的生成机制。这就导致，一旦出现程序崩溃问题，回溯起来就会非常麻烦。


这里，有一个方法可以多少弥补一下这个缺憾。这就是利用Linux的一个工具：addr2line

<!--break-->
这个工具可以将给定的程序地址转换成代码信息，例如文件名、行号、函数名等等。

命令如下：

```bash
user@localhost:~/ $ addr2line -e a.out -i -p -f -s -C cpp -a 0000000000414213 00000000004143a7
```

具体的参数含义这里就不解释了，有兴趣的可以自己看帮助。

这里主要有两个参数需要经常替换：

```
-e ：后面跟的是可执行文件的名称。可以是绝对路径也可以是相对路径。这个可执行文件必须附带调试信息。
```

```
addr ：命令行最后面的地址。可以是一个也可以是多个。
```



现在我们有了将程序地址转换成代码信息的方法了，但是程序地址从哪里来呢？看下面的代码，这实际上是从[Weston](https://github.com/wayland-project/weston/blob/1.9/src/main.c#L355)的代码中抄来的。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <dlfcn.h>
#include <execinfo.h>
#include <signal.h>

#include <sys/types.h>
#include <unistd.h>


#define ARRAY_LENGTH(a) (sizeof (a) / sizeof (a)[0])

static void print_backtrace(void)
{
	void *buffer[32];
	int i, count;
	Dl_info info;

	count = backtrace(buffer, ARRAY_LENGTH(buffer));
	for (i = 0; i < count; i++) {
		dladdr(buffer[i], &info);
		printf("  [%016lx][%016lx]  %s  (%s)\n",
			(long) buffer[i],
			(long) (buffer[i] - info.dli_fbase),
			info.dli_sname ? info.dli_sname : "--",
			info.dli_fname);
	}
}

static void on_caught_signal(int s, siginfo_t *siginfo, void *context)
{
	print_backtrace();
	raise(SIGTRAP);
}

void catch_signals(void)
{
	struct sigaction action;

	action.sa_flags = SA_SIGINFO | SA_RESETHAND;
	action.sa_sigaction = on_caught_signal;
	sigemptyset(&action.sa_mask);
	sigaction(SIGSEGV, &action, NULL);
	sigaction(SIGABRT, &action, NULL);
}
```

只要将上面代码放入工程内，并在main函数的适当位置调用“catch_signals()”。当应用程序崩溃之后，就会通过“print_backtrace()”函数输出调试信息。类似如下：

```bash
  [000000000040853d]  --  (a.out)
  [00000000004085e3]  --  (a.out)
  [000000000040909e]  --  (a.out)
  [0000000000405090]  --  (a.out)
  [0000000000414213]  --  (a.out)
  [00000000004143a7]  --  (a.out)
  [00007f75296ef690]  __libc_start_main  (/lib/libc.so.6)
  [0000000000402f49]  --  (a.out)
```

第一列方括号中的十六进制数值就是我们需要的程序地址。

我们可以试验一下：

```bash
user@localhost:~ $ addr2line -e a.out -i -p -f -s -C cpp -a 0000000000415c59 0000000000415cf2 00007ff324c31540 000000000040862c
0x000000000000000c: ??
??:0
0x0000000000415c59: print_backtrace() at signal.cpp:0
0x0000000000415cf2: on_caught_signal(int, siginfo_t*, void*) at signal.cpp:0
0x00007ff324c31540: ??
??:0
0x000000000040862c: EHFrame::PrintFrame(unsigned long*, int, FrameInfo*) at coda_ehframe.cpp:79

```

可以看到，函数名、文件名、行号，全都被列了出来。



当然，有些时候，我们可能不太方便拿到带有调试信息的可执行文件，那么也可以通过gdb的info symbol命令来获取基本的函数信息。例如：

```bash
(gdb) info symbol 00000000004143a7
EHFrame::PrintBT(user_regs_struct const*) + 292 in section .text of /usr/bin/coda
```


