---
layout: post
title: 变长数组初接触的
tag: [C/C++]
categories: [Program]
---
通过汇编代码分析，可变数组在GCC里面是通过动态偏移sp来实现的。

<!--break-->

换句话说，我们通常的自动变量，在汇编时已经固定了变量所在位置相对于SP基地址的偏移量。而变长数组会根据`[]`内的数值动态计算与`SP`基地址的偏移量。
相应的，`sizeof`的结果也不是像通常的做法直接汇编成立即数，而是临时计算的。

而在嵌入式系统中，因为通常栈的大小都是固定的，而且所有进程可能会独立使用各自的有限大小的堆栈。此时，如果应用了变长数组，就可能会引入栈溢出的风险。因此不建议使用。

下面是转帖：

(原作者：<http://my.csdn.net/yangch_nhcmo>)

> Variable length arrays 是C99的特性，而不是 C++98 的，关于c99标准的变长数组, 在标准的6.7.5.2 Array declarators里面有这样的说明:
>
>> 2.Only ordinary identifiers (as defined in 6.2.3) with both block scope or function prototype scope and no linkage shall have a  variably modified type.
>> If an identifier is declared to be an object with static storage duration, it shall not have a variable length array type.
>
> 换而言之, 变长数组不能是在静态存储区(包括全局变量和静态变量)中的。
>
> 另外，VLA 需要支持 sizeof 运算， 动态sizeof 也是C99的一个特有特性。
>
> 目前很多C++编译器尚不能支持动态数组特性(VC++2005不支持此特性， GCC3.2之后支持，之前的版本没有调查，不知道是从哪个版本开始支持此特性的)。 gcc的文档里面说:Variable-length automatic arrays are allowed in ISO C99, and as an extension GCC accepts them in C89 mode and in  C++。所以，使用GCC，即使你打开 -ansi (等价于 --std=c89)选项，也仍然可以使用动态数组。
>
> 其实C99的VLA也不是真正意义上的变长数组—它只是在运行时可以根据一个变量生成一个数组，此数组此后并不会变化，而真正意义的变长数组可以在实际使用时可以动态伸缩。
