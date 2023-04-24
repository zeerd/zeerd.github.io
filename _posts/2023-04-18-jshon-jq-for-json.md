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
