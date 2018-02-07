---
layout: post
title: Timeout while attempting to communicate with bitbake server
tag: [Yocto,Linux]
---

Yocto编译，一直报如下错误：
```shell
ERROR: Timeout while attempting to communicate with bitbake server
```

在网上搜索，大多数答案都是内存不足。今天突发奇想，重新起了一个工程编译，居然就不报错了。

所以，猜测内存不足的根本原因是在同一个工作环境下编译次数太多，导致垃圾文件太多，延长了Yocto启动检索消耗的时间。

