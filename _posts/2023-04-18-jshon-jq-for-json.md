---
layout: post
title: 两种常用的命令行json文件解析工具（jshon&jq）
tag: [Shell,JSON]
categories: [Linux]
---

<!--break-->

```bash
sudo apt install jshon
sudo apt install jq
```

# 简介

## jshon

这个工具的命令行参数相对简单一些。基本上，靠着`man jshon`就能学会怎么用。
因此，使用上比较灵活但同样的功能也会弱一些。

## jq

这个工具的命令行参数要复杂的多。需要去网上找说明文档，才能搞明白很多进阶用法。
因此，用起来比较复杂，但是功能相对会强大很多。

# 使用

## 一般

通常使用的方法暂时就不写了。比较简单。以后有需要的话，再补充。

## 数组

假设有JSON文件，叫做`a.json`，内容如下：

```json
{
    "a" : {
        "b" : [
            "1", "2", "3"
        ]
    }
}
```

使用`jshon`遍历数组的话，脚本类似如下所示：

```bash
COUNT=$(jshon -e a -e b -l < a.json)
for i in $(seq $COUNT)
do
    echo $(jshon -e a -e b -e $[i-1] -u < a.json)
done
```

使用`jq`遍历数组的话，脚本类似如下所示：

```bash
COUNT=$(jq '.a.b | length' a.json)
for i in $(seq $COUNT)
do
    echo $(jq -r ".a.b[$[i-1]]" a.json)
done
```

读到这里，有人可能要问了：这也没啥明显的差别啊。

确实没啥差别。但是前面的脚本看过`man`就能写出来。后面的脚本必须去网上搜索半天才能写出来。
光看`jq`的`man`甚至可能都无法得知怎么获取数组长度。

接下来再看二维数组：

```json
{
    "a" : {
        "b" : [
            {
                "c" : ["c1", "c2", "c3"]
            },
            {
                "c" : ["d1", "d2", "d3", "d4"]
            }
        ]
    }
}
```

使用`jshon`遍历二维数组的话，脚本类似如下所示：

```bash
b_COUNT=$(jshon -e a -e b -l < a.json)
for i in $(seq $b_COUNT)
do
    echo $(jshon -e a -e b -e $[i-1] -e c < a.json)
    c_COUNT=$(jshon -e a -e b -e $[i-1] -e c -l < a.json)
    for j in $(seq $c_COUNT)
    do
        echo $(jshon -e a -e b -e $[i-1] -e c -e $[j-1] -u < a.json)
    done
done
```

使用`jq`遍历二维数组的话，脚本类似如下所示：

```bash
b_COUNT=$(jq ".a.b | length" a.json)
for i in $(seq $b_COUNT)
do
    echo $(jq ".a.b[$[i-1]].c" a.json)
    c_COUNT=$(jq ".a.b[$[i-1]].c | length" a.json)
    for j in $(seq $c_COUNT)
    do
        echo $(jq -r ".a.b[$[i-1]].c[$[j-1]]" a.json)
    done
done
```

可以看到，明显`jq`的脚本比`jshon`的脚本更贴近一般的程序语言一些。可读性自然也就会高一些。

## 中文

无论是`jq`还是`jshon`，都存在同样的问题。即，无法正确的解析json文件中的`UTF-8`中文字符串。

我在网上搜索了一些文章，比如这篇 [How to convert \\uXXXX unicode to UTF-8 using console tools in \*nix](https://www.gangofcoders.net/solution/how-to-convert-uxxxx-unicode-to-utf-8-using-console-tools-in-nix/) ，都提到了很多看起来简单有效的方法。但是，奇怪的是，在我的Ubuntu环境中，这些方法却都无效。

在解析类似`\uXXXX`这种编码格式时，他们都会出现在我的 [关于Linux下的字符编码出现C2、C3的问题(by ffmpeg)](../ffmpeg-c2c3-bug) 中提到过的乱码现象。估计是和底层的某些系统配置参数有关。

经过复杂的测试，最后发现，我的系统可以识别`\xHH`这种格式，却不能支持`\uHHHH`这种格式。
即，它无法正确识别`"\u00E4\u00B8\u00AD\u00E6\u0096\u0087"`，但是可以识别`"\xE4\xB8\xAD\xE6\x96\x87"`。

于是，产生了一个简单迂回的办法：

```bash
TEXT_T=$(jq -a ".a.b.c" a.json)
TEXT=$(echo -ne "${TEXT_T//\\u00/$'\x'}")
```
