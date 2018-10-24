---
layout: post
title: MSYS2 环境中编译程序提示“_P_WAIT”错误
tag: [MSYS2,Automake]
---

今天，在MSYS2环境下编译libxml2时，提示了一系列类似如下的错误：
<!--break-->


```
./.libs/lt-testRegexp.c:315:19: error: '_P_WAIT' undeclared (first use in this function)
   rval = _spawnv (_P_WAIT, lt_argv_zero, (const char * const *) newargz);
```

解决方法，重新生成一下autoconf的一系列文件：

```
libtoolize --force
aclocal
autoheader
automake --force-missing --add-missing
autoconf
./configure
```

Refer:
http://askubuntu.com/questions/27677/cannot-find-install-sh-install-sh-or-shtool-in-ac-aux
