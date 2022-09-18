---
layout: post
title: Fix abc.so is not portable
tag: [GCC]
categories: [Linux]
---

gcc 编译时遇到如下Warning：

```
*** Warning: Linking the executable xxxxx against the loadable module
*** yyyyy.so is not portable!
```

<!--break-->

原因是在Makefile.am中存在如下内容：
yyyyy_la__LDFLAGS = -module

去掉后面的-module就好了。
