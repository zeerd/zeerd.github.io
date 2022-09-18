---
layout: post
title: C语言源文件注释删除
tags: [C/C++]
categories: [Program]
---

写这个东西，主要是为了进行代码比较。因为在进行比较时，经常会比较出非常多的注释的不同，又没有实际意义。非常让人头疼。下面是代码：

<!--break-->

```c
void nvDoDelComment(FILE* in,FILE *out)
{
 char c1;
 char c2;
 int iSts;
 int iFlag;

 iSts = COMMENT_NONE;
 iFlag = -1;/* 需要判断“紧挨着”这个概念时，Flag设置为1。比如判断是否“/”和“*”紧挨着 */
 while((c1=getc(in)) != EOF){
  switch(c1){
   case '/':
    if(COMMENT_NONE == iSts){
     iSts = FIRST_COMMENT_LINE;
     iFlag = 1;
    }
    else if ((FIRST_COMMENT_LINE == iSts)&&(1 == iFlag)){
     iSts = COMMENT_DOUBEL_LINE;
     iFlag = 0;
    }
    else if ((SECOND_COMMENT_STAR == iSts)&&(1 == iFlag)){
     iSts = COMMENT_END;
     iFlag = 0;
    }
    else{}
    break;
   case '*':
    if ((FIRST_COMMENT_LINE == iSts)&&(1 == iFlag)){
     iSts = FIRST_COMMENT_STAR;
    }
    else if (FIRST_COMMENT_STAR == iSts){
     iSts = SECOND_COMMENT_STAR;
     iFlag = 1;
    }
    else{
    }
    break;
   case '/n':
    if (COMMENT_DOUBEL_LINE == iSts){
     iSts = COMMENT_NONE;
    }
    if ((SECOND_COMMENT_STAR == iSts)){
     iSts = FIRST_COMMENT_STAR;
    }
    else{}
    break;
   default:
    if ((1 == iFlag)&&(FIRST_COMMENT_LINE == iSts)){
     iSts = COMMENT_NONE;
     putc(c2,out);
    }
    else if((0 == iFlag)&&(SECOND_COMMENT_STAR == iSts)){
     iSts = FIRST_COMMENT_STAR;
    }
    iFlag = 0;
    break;
  }
  if (COMMENT_NONE == iSts){
   putc(c1,out);
  }
  else{}
  if (iSts == COMMENT_END){
   iSts = COMMENT_NONE;
  }
  else{}
  c2 = c1;
 }
}
```

没有注释。以后有兴趣的时候可能会添加。不过可能性不大。

原文发表于：[csdn.net 22007-08-28 12:50:00](http://blog.csdn.net/zeerd)
