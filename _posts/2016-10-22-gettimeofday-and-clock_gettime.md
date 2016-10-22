---
layout: post
title: gettimeofday和clock_gettime
tag: Linux,Timeout,Watchdog
---

本文用来记录一下gettimeofday和clock_gettime的重要不同点。
<!--break-->
参照如下的例子程序：

```
    /*
     * gcc t.c -o t -lrt 
     */
    
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    
    #include <time.h>
    #include <sys/time.h>
    
    int main(int argc, char* argv[])
    {
        struct timeval now;
        struct timespec tp;
        struct timezone zone;
    
        int h, m, s;
    
        system("date +'%H:%M:%S'");
    
        gettimeofday(&now, &zone);
        h = now.tv_sec / 60 / 60 % 24;
        m = now.tv_sec / 60 % 60;
        s = now.tv_sec % 60;
        printf("gettimeofday : %02d:%02d:%02d\n", h, m, s);
    
        clock_gettime(CLOCK_MONOTONIC_RAW, &tp);
        h = tp.tv_sec / 60 / 60 % 24;
        m = tp.tv_sec / 60 % 60;
        s = tp.tv_sec % 60;
        printf("clock_gettime : %02d:%02d:%02d\n", h, m, s);
    
        now.tv_sec += 60 * 10;
        settimeofday(&now, &zone);
    
        printf("\n======================\n\n");
    
        system("date +'%H:%M:%S'");
    
        gettimeofday(&now, &zone);
        h = now.tv_sec / 60 / 60 % 24;
        m = now.tv_sec / 60 % 60;
        s = now.tv_sec % 60;
        printf("gettimeofday : %02d:%02d:%02d\n", h, m, s);
    
        clock_gettime(CLOCK_MONOTONIC_RAW, &tp);
        h = tp.tv_sec / 60 / 60 % 24;
        m = tp.tv_sec / 60 % 60;
        s = tp.tv_sec % 60;
        printf("clock_gettime : %02d:%02d:%02d\n", h, m, s);
    
        return 0;
    }
```

运行结果如下所示：

```
17:08:42
gettimeofday : 09:08:42
clock_gettime : 17:42:18

======================

17:08:42
gettimeofday : 09:08:42
clock_gettime : 17:42:18
```

可以看到，随着系统时间的改变，clock_gettime并没有受到影响。

这对于我们在代码中需要处理的各种延迟、WatchDog等会变得更加有利。
