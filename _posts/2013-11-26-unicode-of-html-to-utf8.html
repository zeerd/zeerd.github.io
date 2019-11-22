---
layout: post
title: C语言中将HTML的Unicode转换成UTF8编码的文字
tags: [HTML,Unicode,Utf8,Encoding]
---
随着网络应用的逐渐普及，各种基于HTML的输入也逐步进入了C语言和其他各种语种编程人员的视线。
本文提供一个算法，用于将从html中获取的unicode字符串转换成通常的utf-8字符串。
<!--break-->
所谓的基于html的Unicode字符串，也就是类似“&#xxxx;”这样的字符串。


```cpp
char * html2utf8(
    const char* html, unsigned int html_size, char* utf8, unsigned int utf8_size)
{
    unsigned int i, j, k,l;

    char last_ch = '\\0';
    char html_num[10] = "";
    bool_t find_head = FALSE;

    j=0;
    memset(utf8, 0, utf8_size);
    for(i=0;i<html_size;i++){
        if((html[i] == '#') && (last_ch == '&')){
            find_head = TRUE;
            k = 0;
            memset(html_num, 0, sizeof(html_num));
            if(j>0){
                j--;
            }
        }
        else{
            if(find_head){
                if(html[i] == ';'){
                    unsigned int code = 0;
                    if(html_num[0] == 'x'){
                        code = hex2dec(&html_num[1]);
                    }
                    else{
                        code = atoi(html_num);
                    }
                    char s_code[10] = "";
                    l=0;
                    if(code <= 0xFF){
                        utf8[j++] = code;
                    }
                    else if(code <= 0xFFFF){
                        s_code[l++] = (code>>8)&0x00FF;
                        s_code[l++] = code&0x00FF;
                        char* str = g_convert(
                                        s_code, strlen(s_code), 
                                        "utf-8", "UCS-2BE", 
                                        NULL, NULL, NULL);
                        
                        if(str != NULL){
                            char* it = str;
                            for(;*it!='\\0';it++){
                                utf8[j++] = *it;
                            }
                            g_free(str);
                        }
                    }
                    else{
                    }
                    find_head = FALSE;
                }
                else{
                    html_num[k++] = html[i];
                }
            }
            else{
                utf8[j++] = html[i];
            }
        }
        last_ch = html[i];
        if(j >= utf8_size){
            utf8[j-1] = '\\0';
            break;
        }
    }

    return utf8;
}
```

	    
测试代码：

```c
const char* html[] = {
    "&#32431;&#20013;&#25991;",
    "&#20013;&#25991;&#24102;English",
    "Englist&#21152;&#20013;&#25991;",
    "12345ABCD",
    "ABCD12345",
    "123&#21152;&#20013;&#25991;",
    "&#20013;&#25991;&#24102;123",
    "&#25530;&#26434;Englist&#30340;&#20013;&#25991;",
    "&#25530;&#26434;123&#30340;&#20013;&#25991;"};

    for(i=0;i<ARRAY_SIZE(html);i++){
        html2utf8(html[i], strlen(html[i]), utf8, sizeof(utf8));
        printf("%s[%s]\\n", html[i], utf8);
        memset(utf8, 0, sizeof(utf8));
    }
```
