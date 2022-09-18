---
layout: post
title: 关于Linux下的字符编码出现C2、C3的问题(by ffmpeg)
tags: [FFMpeg,Bug]
categories: [Program]
---

libav(ffmpeg)在获取非utf8编码的媒体文件TAG信息时，会出现一个错误。这个错误的结果就是，TAG信息中的字符串会变成c2 xx c2 xx c3 xx c3 xx的形式。下面的函数用于判断是否字符串变成了种种形式。

<!--break-->

the libav(ffmpeg) would made a mistake when the tag info is not with the encoding of utf-8. and the result is the tag string was like c2 xx c2 xx c3 xx c3 xx . this function used to judge if this happened.

```c
bool is_magiced_by_c2c3(const char str[], int len)
{
    int i;

    if(len >= 2){
        for(i = 0; i < len - 2; i++) {

            if((unsigned char)str[i] < 0x7F) {
            }
            else if((((unsigned char)str[i] == 0xC2U)
                  || ((unsigned char)str[i] == 0xC3U))
                 && (((unsigned char)str[i + 2] == 0xC2U)
                  || ((unsigned char)str[i + 2] == 0xC3U))
                   ) {
                return TRUE;
            }
        }
    }

    return FALSE;
}
```

当这个c2c3的问题发生的时候，其原因如下：

按着id3的规则，媒体的TAG信息的文字编码类型尽可能使iso8859或者是unicode这两种形式。但是，如果用户在windows上编辑了TAG信息，微软在这里没有按着规则办事，即没有存储UTF8的中文到媒体文件，而是存储的GB2312，同时将编码类型标记为了ISO8859。libav（ffmpeg）并不知道这个事情，它认为那就是iso8859，并把它转换成了UFT8。

所以，当我们遇到了c2c3问题时，我们需要进行两次编码类型的转换。第一次是将字符类型从UTF8转换成ISO8859，即逆向libav的工作。然后，在将字符类型从GB2312转换成UTF8，获得我们实际需要的真实类型。

when the c2c3 bugs occur , the reason like below:

the rule of id3 was marked as there were only two kinds of encoding for the text. one is iso8859, the other one is unicode. when a user edit the tag of a media file on a windows system, the windows system marked the text''s encoding as iso8859, but it''s gb2312. libav(mmfpeg) though is iso8859, and convert it to utf8.

so, when we meet a string bugged as c2c3, we need to convert it back to iso8859 , and convert it to utf8 again with the source-encoding of gb2312.

```c
if(is_magiced_by_c2c3(src, strlen(src))) {
    if(convert_encoding(
            "ISO-8859-1",  //to
            "UTF-8",  //from
            gbcode_src, //to
            src_len * 2, //to size
            (const char*)src, //from
            len //from size
                            ) != U_ZERO_ERROR){
        printf("ucnv_convert error\\n");
    }

    if(convert_encoding(
            "UTF-8",  //to
            "GB2312", //from
            dsc, //to
            dec_len, //to size
            (const char*)gbcode_src, //from
            strlen(gbcode_src) //from size
                            ) != U_ZERO_ERROR){
        printf("ucnv_convert error\\n");
    }
}
```

refer : http://tech.idv2.com/2008/10/28/perl-utf8-c3c2-problem/
