---
layout: post
title: 批量生成带TAG信息的MP3测试文件
tags: [TAG]
categories: [Program]
---

下面这个shell脚本，可以批量生成带有指定长度TAG字符串的mp3文件。用于进行各种容量方面的测试。
需要准备一个ding.mp3文件放在shell脚本同路径下。

<!--break-->

```bash
#!/bin/bash

function show_usage()
{
    echo "Usage : " $0 "<tag text length> <file number to make>"
}

if [ -z "$1" ];then
    show_usage
else
    max_num=$1
    output_path=$2

    if [ ! -d $output_path ];then
        echo making folder to save the files ... `pwd`/$output_path
        mkdir $output_path
    fi

    for i in $(seq $output_path) ;do
        s=""
        for j in $(seq $max_num) ;do
            s=$s"$i"
        done
        r=${s:0:$max_num}

        fmt="%0"${#output_path}"d"
        filename=$output_path"/"`printf $fmt $i`".mp3"
        `avconv -v 0 -i ding.mp3 -c copy \
            -metadata title=$r -metadata artist=$r -metadata album=$r \
            -metadata composer=$r -metadata genre="Other" \
            $filename`
        echo -n .
    done

    echo done.
fi
```
