---
layout: post
title: 一种针对Stack Smashing的调查方法
tag: [Stack]
categories: [Program]
---

开发中遇到一种栈相关的崩溃错误。

直接的表现为命令行提示“`*** stack smashing detected ***: terminated`”，同时程序崩溃退出。

<!--break-->

如果使用`gdb`等方式跟踪程序，会看到类似如下的调用栈：

```
abort : /lib/x86_64-linux-gnu/libc.so.6
-- : /lib/x86_64-linux-gnu/libc.so.6
__fortify_fail : /lib/x86_64-linux-gnu/libc.so.6
__stack_chk_fail : /lib/x86_64-linux-gnu/libc.so.6
```

出现这个问题的一个原因是栈被意外的改写，也就是“Stack Smashing”。

这个词通常被翻译成“栈溢出”，我们常听到的某某黑客利用“栈溢出”攻击获取`root`限，说的就是这个“`Stack Smashing`”。它与另一个我们更加常用的概念“ `Stack Overflow` ”都被翻译成了“栈溢出”。但实际上，我更倾向于将前者翻译成“栈污染”。当然，这是题外话，接下来还是回归主题。

# 简述

要调查这个问题，简单地说，分两步：

1、添加`gcc`的编译选项：

```bash
-fsanitize=address
```

2、直接运行；或者根据需求在运行时增加环境变量来开启更多检测功能。例如：“`ASAN_OPTIONS=detect_stack_use_after_return=true`”。更多可选的环境变量可以参照“[AddressSanitizerFlags](https://github.com/google/sanitizers/wiki/AddressSanitizerFlags#run-time-flags)”。当需要引入多个参数时，使用“`:`”隔开。


# 展开

以如下的代码为例：

```cpp
#include <thread>
#include <memory>
#include <unistd.h>

static int i;
static std::shared_ptr<std::thread> mythread = NULL;

void fooA(void)
{
    char a[16] = { 0 };
    mythread = std::make_shared<std::thread>([&] {
        sleep(1);
        a[0] = 1; /* this will modify b[0] in fooB() */
        printf("AA:%d/%p\n", a[0], &a[0]);
    });
    mythread->detach();
}

void fooB(void)
{
    char b[16] = { 0 };
    for(i=0;i<15;i++) {
        printf("%02d:%d/%p\n", i, b[0], &b[0]);
        usleep(100 * 1000);
    }
}

int main(int argc, char*argv[])
{
    fooA();
    fooB();
    return 0;
}
```

这个代码的核心是：在`fooA()`函数返回之后，由于函数形式的特殊性，`fooB()`重用了`fooA()`的栈区域。接下来，在`mythread`线程中修改了`a[0]`的值。也就是说，在`mythread`线程中修改了`main`线程的栈。


编译：

```bash
$ g++ a.cpp -pthread -g -fsanitize=address
```

直接执行`./a.out`，效果如下图所示：

```
00:0/0x7fff23c18870
01:0/0x7fff23c18870
02:0/0x7fff23c18870
03:0/0x7fff23c18870
04:0/0x7fff23c18870
05:0/0x7fff23c18870
06:0/0x7fff23c18870
07:0/0x7fff23c18870
08:0/0x7fff23c18870
09:0/0x7fff23c18870
AA:1/0x7fff23c18870
10:1/0x7fff23c18870
11:1/0x7fff23c18870
12:1/0x7fff23c18870
13:1/0x7fff23c18870
14:1/0x7fff23c18870
```

可以看到，在“`AA`”，也就是`mythread`修改了`a[0]`之后，`b[0]`的内容同样被改写。

注意：这个示例程序并没有触发“`stack smashing detected`”。我尽可能去通过简单的示例还原错误现场，但是失败了…… 如果要深究这个问题的话，需要深入了解一下Linux的[canary](https://en.wikipedia.org/wiki/Buffer_overflow_protection)机制。这里，暂时忽略这个问题，仅讨论如何捕获这个错误。

接下来，带上环境变量重新执行执行`./a.out`，这一次，`sanitizers`会给出一个详细的报告：

```bash
$ ASAN_OPTIONS=detect_stack_use_after_return=true ./a.out 
00:0/0x7f917adce1a0
01:0/0x7f917adce1a0
02:0/0x7f917adce1a0
03:0/0x7f917adce1a0
04:0/0x7f917adce1a0
05:0/0x7f917adce1a0
06:0/0x7f917adce1a0
07:0/0x7f917adce1a0
08:0/0x7f917adce1a0
09:0/0x7f917adce1a0
=================================================================
==105248==ERROR: AddressSanitizer: stack-use-after-return on address 0x7f917aece060 at pc 0x5598b9da657c bp 0x7f917a2fec90 sp 0x7f917a2fec80
WRITE of size 1 at 0x7f917aece060 thread T1
10:0/0x7f917adce1a0
11:0/0x7f917adce1a0
    #0 0x5598b9da657b in operator() /home/user/a.cpp:13
    #1 0x5598b9da7c45 in __invoke_impl<void, fooA()::<lambda()> > /usr/include/c++/9/bits/invoke.h:60
    #2 0x5598b9da7baa in __invoke<fooA()::<lambda()> > /usr/include/c++/9/bits/invoke.h:95
    #3 0x5598b9da7adf in _M_invoke<0> /usr/include/c++/9/thread:244
    #4 0x5598b9da7a65 in operator() /usr/include/c++/9/thread:251
    #5 0x5598b9da79d1 in _M_run /usr/include/c++/9/thread:195
    #6 0x7f917e899de3  (/lib/x86_64-linux-gnu/libstdc++.so.6+0xd6de3)
    #7 0x7f917e63e608 in start_thread /build/glibc-SzIz7B/glibc-2.31/nptl/pthread_create.c:477
    #8 0x7f917e563132 in __clone (/lib/x86_64-linux-gnu/libc.so.6+0x11f132)

Address 0x7f917aece060 is located in stack of thread T0 at offset 96 in frame
    #0 0x5598b9da65f3 in fooA() /home/user/a.cpp:9

  This frame has 3 object(s):
    [32, 40) '<unknown>'
    [64, 80) '<unknown>'
    [96, 112) 'a' (line 10) <== Memory access at offset 96 is inside this variable
HINT: this may be a false positive if your program uses some custom stack unwind mechanism, swapcontext or vfork
      (longjmp and C++ exceptions *are* supported)
SUMMARY: AddressSanitizer: stack-use-after-return /home/user/a.cpp:13 in operator()
Shadow bytes around the buggy address:
  0x0ff2af5d1bb0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1bc0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1bd0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1be0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1bf0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
=>0x0ff2af5d1c00: f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5[f5]f5 f5 f5
  0x0ff2af5d1c10: f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5
  0x0ff2af5d1c20: f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 f5 00 00 00 00
  0x0ff2af5d1c30: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1c40: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0ff2af5d1c50: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
Shadow byte legend (one shadow byte represents 8 application bytes):
  Addressable:           00
  Partially addressable: 01 02 03 04 05 06 07 
  Heap left redzone:       fa
  Freed heap region:       fd
  Stack left redzone:      f1
  Stack mid redzone:       f2
  Stack right redzone:     f3
  Stack after return:      f5
  Stack use after scope:   f8
  Global redzone:          f9
  Global init order:       f6
  Poisoned by user:        f7
  Container overflow:      fc
  Array cookie:            ac
  Intra object redzone:    bb
  ASan internal:           fe
  Left alloca redzone:     ca
  Right alloca redzone:    cb
  Shadow gap:              cc
Thread T1 created by T0 here:
12:0/0x7f917adce1a0
    #0 0x7f917e9df815 in __interceptor_pthread_create ../../../../src/libsanitizer/asan/asan_interceptors.cc:208
    #1 0x7f917e89a0a8 in std::thread::_M_start_thread(std::unique_ptr<std::thread::_State, std::default_delete<std::thread::_State> >, void (*)()) (/lib/x86_64-linux-gnu/libstdc++.so.6+0xd70a8)
    #2 0x5598b9da7430 in construct<std::thread, fooA()::<lambda()> > /usr/include/c++/9/ext/new_allocator.h:146
    #3 0x5598b9da73e6 in construct<std::thread, fooA()::<lambda()> > /usr/include/c++/9/bits/alloc_traits.h:483
    #4 0x5598b9da731f in _Sp_counted_ptr_inplace<fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr_base.h:548
    #5 0x5598b9da700c in __shared_count<std::thread, std::allocator<std::thread>, fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr_base.h:679
    #6 0x5598b9da6da3 in __shared_ptr<std::allocator<std::thread>, fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr_base.h:1344
    #7 0x5598b9da6c38 in shared_ptr<std::allocator<std::thread>, fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr.h:359
    #8 0x5598b9da6b5f in allocate_shared<std::thread, std::allocator<std::thread>, fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr.h:702
    #9 0x5598b9da6a90 in make_shared<std::thread, fooA()::<lambda()> > /usr/include/c++/9/bits/shared_ptr.h:718
    #10 0x5598b9da671b in fooA() /home/user/a.cpp:11
    #11 0x5598b9da6992 in main /home/user/a.cpp:30
    #12 0x7f917e468082 in __libc_start_main ../csu/libc-start.c:308

==105248==ABORTING
```

简单地说，`sanitizers`发现测试程序在“`a.cpp:13`”修改了“`a.cpp:9`”的栈。然后，我们需要根据看到的现象和自己的知识来推导出修改了`a[0]`导致`b[0]`被修改。

当然，无论如何，修改了`a[0]`处的问题，`b[0]`的问题也就消失了。

# 参照

[关于GCC/LLVM编译器中的sanitize选项用处用法详解](https://blog.csdn.net/weixin_46222091/article/details/104375875)
