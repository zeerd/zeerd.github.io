---
layout: post
title: 计算Linux程序的栈使用量
tags: [Debug,Stack]
categories: [Linux]
---

<!--break-->

下面代码是从网上抄来的。原文见参照区的链接。

```c
/* gcc stack.c -o stack -pthread */

#define _GNU_SOURCE // for pthread_getattr_np
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>

void print_stack(void)
{
    size_t used, avail;
    pthread_attr_t attr;
    void *stack_addr;
    size_t stack_size;

    size_t esp_val;
    if(sizeof(void*) == 8) {
        asm("movq %%rsp, %0" : "=m"(esp_val) :); // x86_64
    }
    else {
        asm("movl %%esp, %0" : "=m"(esp_val) :); // x86
    }

    memset(&attr, 0, sizeof(pthread_attr_t));
    pthread_getattr_np(pthread_self(), &attr);
    pthread_attr_getstack(&attr, &stack_addr, &stack_size);
    pthread_attr_destroy(&attr);

    printf("statck top   = %p \n", stack_addr);
    printf("espVal       = %p \n", (void*)esp_val);
    printf("stack bottom = %p \n", stack_addr + stack_size);

    avail = esp_val - (size_t)stack_addr;
    used = stack_size - avail;

    printf("print_stack1: used = %ld, avail = %ld, total = %ld \n",
                                                    used, avail, stack_size);

    for(size_t i=0; i<=used; i+=16) {
        printf("%p : ", (void*)esp_val + i);
        for(size_t j=0; j<16; j++) {
            printf("%02X ", ((unsigned char*)esp_val)[i + j]);
        }
        printf("\n");
    }
    printf("\n");
}

int main(int argc, char *argv[])
{
    (void)argc;
    (void)argv;

    print_stack();
    return 0;
}
```

多次运行，会发现一个奇怪的现象。即：每次的“espVal”都不相同。
而理论上，在这个程序固定下来之后，对栈的使用量应该就是固定的了。

调查发现，在Linux系统中，存在一个叫做ASLR的机制。
引入这个机制的一个目的是防止黑客的攻击。但这也导致程序运行时，每次堆栈的起始位置都是随机的。

存在两个办法来避免随机值带来的影响。

第一个办法是，关闭系统的ASLR功能。

```bash
echo 0 > /proc/sys/kernel/randomize_va_space
```

第二个办法是，仅在运行时，关闭被运行的应用程序的ASLR。

```bash
setarch `uname -m` -R ./stack
```

# 参照

[Linux应用程序设计：用一种讨巧方式，来获取线程栈的使用信息](https://zhuanlan.zhihu.com/p/376530885)
[Address Space Layout Randomization](https://docs.oracle.com/en/operating-systems/oracle-linux/6/security/ol_aslr_sec.html)
[x86_64 Get Stack Pointer (RSP)](https://blogs.umb.edu/michaelbazzinott001/2014/09/24/x86_64-get-stack-pointer-rsp/)
[GCC-Inline-Assembly-HOWTO](http://www.ibiblio.org/gferg/ldp/GCC-Inline-Assembly-HOWTO.html)
