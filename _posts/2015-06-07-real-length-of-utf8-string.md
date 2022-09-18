---
layout: post
title: the real length of utf8 string
tag: [String,Utf8]
categories: [Program]
---
本函数用于计算Utf8字符的实际占位长度。

<!--break-->

我们都知道，无论字符编码是什么类型，一个中文汉字在控制台下都占两个字节的位置。
为了能够精确地制表，我们必须知道一个UTF8字符串的实际占位长度。

下面函数可以做到这个。

```c
int utf8_strlen(const char *str)
{
    int i, s=0, len = strlen(str);

    for(i=0;i<len;i++) {
        if(!(str[i]&0x80) || ((str[i]&0xC0) == 0xC0)) {
            s++;
        }
    }
    return (s+len)/2;
}
```
