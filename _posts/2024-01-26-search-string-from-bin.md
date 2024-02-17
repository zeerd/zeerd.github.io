---
layout: post
title: 筛查二进制文件中是否包涵敏感字符
tag: [Shell]
categories: [Linux]
---

<!--break-->

在对外发布的二进制文件中筛查敏感常量信息。比如 LOG 中包涵了设备型号。

```
find /root/path/to/releases -type f \
    -exec sh -c "file -i '{}' | grep -q 'charset=binary'" \; -print  \
    | xargs -x strings -f | grep -i <keyword>
```
