---
layout: post
title: 在C语言中设计动态内存申请失败相关的单元测试
tag: [C/C++,malloc,UnitTest]
categories: [Program]
---

<!--break-->

需要注意的只有一点：

dlsym会使用`calloc`函数。因此，calloc的指针必须在第一次使用之前就准备好。

我目前的做法是，在`malloc`函数中分一次性获取所有的指针。然后确保在第一个`calloc`之前，至少调用一次`malloc`。

## 源码

### 核心库

```c
/* gcc wrap_malloc.c -shared -o libwrap.so -ldl -fPIC */

#include <stdio.h>
#include <stdlib.h>

#define __USE_GNU
#include <dlfcn.h>

static void* (*real_malloc)(size_t) = NULL;
static void* (*real_calloc)(size_t, size_t) = NULL;
static void* (*real_realloc)(void*, size_t) = NULL;

void* malloc(size_t size)
{
    if (real_malloc == NULL) {
        real_malloc = dlsym(RTLD_NEXT, "malloc");
    }
    if (real_calloc == NULL) {
        real_calloc = dlsym(RTLD_NEXT, "calloc");
    }
    if (real_realloc == NULL) {
        real_realloc = dlsym(RTLD_NEXT, "realloc");
    }

    void *p = NULL;
    char *e = getenv("NULL_MALLOC");
    if (e == NULL && real_malloc != NULL) {
        p = real_malloc(size);
    }
    return p;
}

void *calloc(size_t nmemb, size_t size)
{
    void *p = NULL;
    char *e = getenv("NULL_MALLOC");
    if (e == NULL && real_calloc != NULL) {
        p = real_calloc(nmemb, size);
    }
    return p;
}

void *realloc(void *ptr, size_t size)
{
    void *p = NULL;
    char *e = getenv("NULL_MALLOC");
    if (e == NULL && real_realloc != NULL) {
        p = real_realloc(ptr, size);
    }
    return p;
}
```

### 测试代码

```c++
/* g++ main.cpp -o test `pkg-config gtest gtest_main --cflags --libs` */

#include <stdlib.h>
#include <gtest/gtest.h>

TEST(malloc, normal)
{
    char *p = (char*)malloc(4);
    EXPECT_NE(p, (char*)NULL);
    free(p);

    setenv("NULL_MALLOC", "1", 1);
    p = (char*)malloc(4);
    unsetenv("NULL_MALLOC");
    EXPECT_EQ(p, (char*)NULL);

    p = (char*)malloc(4);
    EXPECT_NE(p, (char*)NULL);
    free(p);
}

TEST(calloc, normal)
{
    char *p = (char*)calloc(4, 4);
    EXPECT_NE(p, (char*)NULL);
    free(p);

    setenv("NULL_MALLOC", "1", 1);
    p = (char*)calloc(4, 4);
    unsetenv("NULL_MALLOC");
    EXPECT_EQ(p, (char*)NULL);

    p = (char*)calloc(4, 4);
    EXPECT_NE(p, (char*)NULL);
    free(p);
}

TEST(realloc, normal)
{
    char *p = (char*)malloc(4);
    EXPECT_NE(p, (char*)NULL);
    p = (char*)realloc(p, 10);
    EXPECT_NE(p, (char*)NULL);
    free(p);

    p = (char*)malloc(4);
    EXPECT_NE(p, (char*)NULL);
    setenv("NULL_MALLOC", "1", 1);
    p = (char*)realloc(p, 40);
    unsetenv("NULL_MALLOC");
    EXPECT_EQ(p, (char*)NULL);

    p = (char*)malloc(10);
    EXPECT_NE(p, (char*)NULL);
    p = (char*)realloc(p, 40);
    EXPECT_NE(p, (char*)NULL);
    free(p);
}

int main(int argc, char **argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    ::testing::FLAGS_gtest_break_on_failure = false;

    return RUN_ALL_TESTS();
}
```

## 编译和运行：

```bash
gcc wrap_malloc.c -shared -o libwrap.so -ldl -fPIC
g++ main.cpp -o test `pkg-config gtest gtest_main --cflags --libs`
LD_PRELOAD=/path/to/libwrap.so ./test 
```

## 参照：

[替换 malloc 的方法](https://my.oschina.net/chunquedong/blog/271248)
