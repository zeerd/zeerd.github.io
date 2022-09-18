---
layout: post
title: strict-aliasing rules
tag: [GCC]
categories: [Program]
---
很多人都在纠结这个Warning：
<!--break-->

```
warning： dereferencing type-punned pointer will break strict-aliasing rules
```

简单说明：

1、不同类型的指针互相强制转换是不被允许的。

比如：`long a=1; short *p=(short*)&a;*p=2;`

这个操作并不能一定改变`a`的值，甚至可能一定不会改变`a`的值。取决于你还做了其他什么事情。

2、如果你最终又把它转回去了，则没有问题。

比如：`long a=1; void *p=(void*)&a; long *b=(long *)p;*b=2;`

这个操作是安全的。

详细一些的说明：

这是在C99中引入的一个新的概念（好吧，十多年了，不新了）。

粗略的理解，就是编译器会对指针的使用进行执行效率方面的优化。

在进行这种优化时，C99破坏了一些C99之前约定俗成的东西。

即，C99认为，在开启`strict-aliasing`规则的情况下，两个不同的类型的指针必然不会指向同一位置。
举个简单的例子：

```c
int v=0x12345678;
int main()
{
    int a = v;
    short *p = (short *)&a;
    short temp;
    temp = *p;
    *p = *(p+1);
    *(p+1) = temp;
    printf("%x\n", a);
}
```

```
$gcc -O2 test.c
$./a.exe
```

程序的作用是将`a`的高低位互换位置，猜猜结果是什么？然后再用鼠标拖动选择【】看看实际的结果是什么？
【<font color=white>12345678</font>】

实际的情况，因为开启`strict-aliasing`规则的C99认为`a`和`p`是不同类定的指针，他们必然不会指向同一个位置。

因此，第`4`行到第`8`行的代码虽然在努力的工作着。但是他们的工作与`a`没有任何关系。所有中间结果都在寄存器中缓存、然后被丢弃了。

下面是汇编结果：

```
call ___main
movzwl -2(%ebp), %eax
movswl -4(%ebp),%edx
movl $305419896, -4(%ebp)
movl $LC0, (%esp)          《====将参数1（%x\n）入栈
movw %ax, -4(%ebp)
movl $305419896, %eax      《====将$305419896地址下的数值放入eax寄存器，$305419896是一个地址，指向的是立即数0x12345678
movw %dx, -2(%ebp)
movl %eax, 4(%esp)         《=====将参数2（eax寄存器内的数值）入栈
call _printf               《====== 打印
```

可以看到，`printf`直接使用了立即数，根本没管`p`和`temp`忙了些什么。

免责声明：

以上是我今天不到2个小时之内从网络上获取的思路和个人的理解，不敢保全对。所以，如果你很较真，我建议你查找一下C99标准文档。

参考：

<http://hi.baidu.com/junru/blog/item/14589545b9bc6f23cffca3dd.html>
<http://blog.csdn.net/world_hello_100/article/details/7677622>
