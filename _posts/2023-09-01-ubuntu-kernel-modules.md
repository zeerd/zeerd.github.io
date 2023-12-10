---
layout: post
title: 在 Ubuntu 下独立编译内核模块
tag: [Kernel]
categories: [Program]
---

<!--break-->

参考了
《 [Linux驱动实践：带你一步一步编译内核驱动程序](https://zhuanlan.zhihu.com/p/434163532) 》
和
《 [Makefile独立编译ko文件](https://blog.csdn.net/zzsxyl/article/details/121546850) 》
两篇文章。

`hello.c`也是直接抄的，懒得重写了。

首先建立一个新的目录。

在其中添加一个叫做`hello.c` 的文件。内容如下：


```c
#include <linux/module.h>
#include <linux/init.h>

// 当驱动被加载的时候，执行此函数
static int __init hello_init(void)
{
    printk(KERN_ALERT "welcome, hello\n");
    return 0;
}

// 当驱动被卸载的时候，执行此函数
static void __exit hello_exit(void)
{
    printk(KERN_ALERT "bye, hello\n");
}

// 版权声明
MODULE_LICENSE("GPL");

// 以下两个函数属于 Linux 的驱动框架，只要把驱动两个函数地址注册进去即可。
module_init(hello_init);
module_exit(hello_exit);
```

然后创建`Makefile`文件，内容如下：


```makefile
BUILD_KERNEL=$(shell uname -r)
KSRC := /lib/modules/$(BUILD_KERNEL)/build

obj-m += hello.o

default:
	$(MAKE) -C $(KSRC) M=$(shell pwd) modules

clean:
	$(MAKE) -C $(KSRC) M=$(shell pwd) clean
```

之后敲`make`就可以了。

然后就是执行`sudo insmod hello.ko`和`sudo rmmod hello`并观察`dmesg`的输出。


这里需要注意的是，如果你是直接使用`apt`命令安装的`linux-headers-x.x.x-x-generic`，
那么原则上是一定会好用的。

如果不好用，请优先考虑执行一遍`sudo apt upgrade`，看看是否当前版本的代码有问题或者干脆安装时出现了遗漏。

我就是发现本地`/lib/modules/`下的最新的代码是`82`版本的，但是`kernel`是`79`版本。于是，我遇到了如下问题：

执行`sudo insmod hello.ko`之后，提示`insmod: ERROR: could not insert module ./mymod.ko: Invalid module format`。

执行`dmesg`可以看到`[ 5180.365546] module: x86/modules: Skipping invalid relocation target, existing value is nonzero for type 1, loc 00000000df2a29e3, val ffffffffc14970b6`

`sudo apt upgrade`之后，问题消失。

以上，在`5.15.0-82-generic #91~20.04.1-Ubuntu`验证成功。
