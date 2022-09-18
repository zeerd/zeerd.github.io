---
layout: post
title: Hack NetHack
tag: [NetHack]
categories: [Program]
---

<!--break-->

## A Happy Start with NetHack

说实话，NetHack是个好游戏。但是，在我连续四次被饿死之后，我已经出离愤怒了。我决定用我自己的手段来为喂饱自己！

首先，任何人都可以从“http://www.nethack.org/index.html”的相关页面下载他们的基于GPL的源代码。然后就可以随便蹂躏了。

我不太清楚是否作者们在打包的时候弄错了什么，或者编译其版本的问题，总之直接编译会提示某些文件不在预定的位置。所以我对目录结构进行了小的调整。

1、从Win目录中将“Win32”这个目录复制到你的“Top”目录中一份；
2、使用VC环境打开复制好的那一份“Win32”内的dsw文件；
3、在你的“Top”目录内建立一个空文件夹，名字为“Build”；
3、编译。成功之后会在“Top”目录下建立一个“binary”目录，运行里面的东西就可以了。

注：
1、“Top”目录是我从NetHack的说明文当中学来的词汇。其实就是你解压缩之后的那个文件夹……
2、在首次编译之前，不要试图打开任何资源文件。这些会在第一次编译之后自动生成。


下面，编译已经成功了。接下来的内容就是看懂究竟我是怎么被饿死的了……


## 关于饥饿和其他

继续前面的内容，嗯，我们不希望人物感到饥饿。

这部分内容，我在`Eat.c`文件的`gethungry()`函数中找到了答案。只要在这个函数的最开始，加一条`return`语句让这个函数无效化。那么，在通常的走路、搜索等动作中就不会使人物感到饥饿了。当然，在学习等其他时候还是会继续饥饿的。但是，我并不打算修改这一部分。毕竟这是可以接受的。

而修改了此处之后，就引发了一个新的问题。游戏中很多时候都可以通过吃尸体（真恶心 `-_-! `） 来增加属性或则抑制饥饿。所以，还要解决吃得太饱的问题——走路不会导致饥饿，使得人物基本上吃几次就处于“腻”的状态了。

针对这个问题，需要对`lesshungry(num)` 函数进行修改。只要将其中开头的“`u.uhunger += num;`”删除掉就可以了。

另外，施法职业的Pw消耗得很快，而且初期自保能力实在不行，所以我对Pw的消耗部分也作了变动。在`Spell.c`的`spelleffects(spell, atme)`函数中，找到“`u.uen -= energy;`”并删除掉。这样处理之后，在正常施法的时候就不会消耗Pw了。当然，如果施法失败的话，还是会消耗的。

## You等用法

在NetHack的程序中，大量的使用了诸如“You("don't have anything to put in.")”之类的语句。
这些语句实际上是一些封装好的输出指令，用来快速的输出一些描述内容。
估计是出于一致性的考虑，整个NetHack源代码中充斥着各种各样的宏定义，用来保证在不同平台、不同编译器中都能使程序进行编译。
当然，如果你只是想简单的了解程序结构的话，这样的处理方式也可以大大地提高程序的可读性。
但是，如果你想进一步研究其原理，或者像我一样想做一些简单的汉化的话，就会遇到很多麻烦。
好在经过不懈的努力，我终于在上千条的搜索结果中找到了You函数及其他类似函数的函数体——他们就安静得躺在Pline.c这个文件之中。

## 未完不续

原文发表于：[csdn.net 2007-09-27 23:03:00 ~ 2007-10-08 12:58:00](http://blog.csdn.net/zeerd)