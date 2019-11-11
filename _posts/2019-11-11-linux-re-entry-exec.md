---
layout: post
title: Linux下重新封装可执行文件的入口
tag: [Linux,Gcc,Debug]
---


在开发过程中，遇到一个情况：开发使用的一个组件是第三方以二进制的形式提供的动态链接库。而这个库文件中封装了main函数。

我们现在需要测试一些应用程序在启动过程中的关键时间点。但是由于main函数被封装了，所以，应用程序启动的这个时间点就变得不可测量了。

鉴于这个情况，我打算用借用gcc的替换掉entry函数的参数方式，强制在main函数之前执行一个函数，用于输出时间戳。

大体的思路如下：

```c
#include <stdio.h>

extern int main(int argc, char *argv[]);

int my_entry_main(int argc, char *argv[])
{
	printf("Hello!\n");

	return main(argc, argv);
}
```

```bash
~# gcc -nostartfiles -e my_entry_main my_entry_main.c -labc -o a.out
```

但是，编译之后发现，可执行文件一运行就会崩溃。



后来想到，原来是思维陷入了一个误区。对于开发人员来说，main函数是程序的入口，可实际上，真正的可执行文件入口却不是main函数。见如下数据片段：

```bash
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 03 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - GNU
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x403e00
  Start of program headers:          64 (bytes into file)
  Start of section headers:          3323760 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         8
  Size of section headers:           64 (bytes)
  Number of section headers:         39
  Section header string table index: 36

                                           ......

    76: 0000000000403e00    42 FUNC    GLOBAL DEFAULT   13 _start
```

可以看到，“Entry point address”的地址是0x403e00，再继续向下找，可以看到，这个地址对应的函数实际上是_start而不是main。



修改一下刚才的代码：

```c
#include <stdio.h>

extern int _start(int argc, char *argv[]);

int my_entry_main(int argc, char *argv[])
{
	printf("Hello!\n");

	return _start(argc, argv);
}

```

再次编译，可以看到，可执行文件能够正常被执行了。



Ref: [gcc如何设置程序的入口函数](https://blog.csdn.net/hnyzyty/article/details/45776275)
