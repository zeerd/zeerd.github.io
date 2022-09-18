---
layout: post
title: C++中的static陷阱
tags: [C/C++,Bug]
categories: [Program]
comments: true
---
通常，讲述C++的书籍资料中，都会提到class的static类型成员变量的问题。但是后少有人会提到如果在成员函数中定义了静态成员变量会发生什么事情。<br>
<!--break-->

今天帮助朋友调查了一个重现率很低的问题，就是这个原因造成的。

因为写类成员函数时，一时偷懒定义了static类型的函数级成员变量，而没有定义城类成员变量，导致两个类实体内的计算互相影响，产生了BUG。

看下面实例：
```cpp
#include <stdio.h>

class A {
public:
    int Fun()
    {
        static int a=0;
        printf("%x\n", &amp;a);
    }
};

int main()
{
    A aa;
    A ab;
    aa.Fun();
    ab.Fun();
    return 0;
}
```
  输出结果：
```
  601030
  601030
```
    
  说明两个实体中，函数静态成员变量和static类型的类成员变量一样，所有类实体共用同一个内存空间。
