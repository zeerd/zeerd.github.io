---
layout: post
title: 在 C++中统计动态内存分配情况（扩展）
tag: [c++,malloc]
---

之前，在 [在 C++中统计动态内存分配情况](http://blog.zeerd.com/summary-cpp-new-delete/) 中展示过一段用于在C++中统计动态内存分配情况的测试代码。最近对这段代码进行了一些扩充。
<!--break-->

新的代码将对new/delete的重载inline函数的方式 放入到了头文件中。便于将这个测试程序编译成库提供给其他开发者使用。

my_mem.h
```c++
#ifndef __MY_MEM_H__
#define __MY_MEM_H__

#ifdef __cplusplus
    #include <new>
#endif

#include <stdio.h>
#include <stdlib.h>

#include <sys/types.h>
#include <unistd.h>

////////////////////////////////////////////////////////////////////////////////
////////////////////////////    PUBLIC     /////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _DEBUG_MEMORY_

    #define my_malloc(s)     _my_malloc((s), __FILE__, __LINE__)
    #define my_calloc(n, s)  _my_calloc((n), (s), __FILE__, __LINE__)
    #define my_realloc(p, s) _my_realloc((p), (s), __FILE__, __LINE__)

    extern void my_free(void *ptr);

    typedef void (*debug_malloc_detail_func)(
        const char* file, int line, size_t size, void* user_data);

    extern size_t debug_malloc_summary(void);
    extern void debug_malloc_summary_details(
                                    debug_malloc_detail_func, void*);

#else

    #define my_malloc  malloc
    #define my_calloc  calloc
    #define my_realloc realloc
    #define my_free    free

#endif

#ifdef __cplusplus
}
#endif

////////////////////////////////////////////////////////////////////////////////
////////////////////////////    PRIVATE    /////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

#ifdef _DEBUG_MEMORY_

    #define _DEBUG_MEMORY_LOG(fmt, ...)
    // #define _DEBUG_MEMORY_LOG(fmt, ...) printf(fmt, ##__VA_ARGS__);

    #ifdef __cplusplus
    extern "C" {
    #endif

        extern void *_my_malloc(size_t size,
                                    const char* file, int line);
        extern void *_my_calloc(size_t nmemb,
                                    size_t size, const char* file, int line);
        extern void *_my_realloc(void *ptr,
                                    size_t size, const char* file, int line);

        extern void debug_malloc_insert(void* p,
                                    size_t size, const char* file, int line);
        extern void debug_malloc_remove(void* p);

    #ifdef __cplusplus
    }
    #endif

    #ifdef __cplusplus

        inline void* operator new (std::size_t size,
                                    const char* file, int line)
        {
            void *p = malloc (size);

            debug_malloc_insert(p, size, file, line);

            _DEBUG_MEMORY_LOG("[%5d][%s:%d]new %p : %d\n",
                getpid(), file, line, p, size);
            return p;
        }

        inline void* operator new[] (std::size_t size,
                                    const char* file, int line)
        {
            void *p = operator new (size, file, line);
            return p;
        }

        inline void operator delete (void* ptr)
        {
            debug_malloc_remove(ptr);
            _DEBUG_MEMORY_LOG("[%5d]delete %p\n", getpid(), ptr);

            free (ptr);
        }

        inline void operator delete[] (void* ptr)
        {
           operator delete (ptr);
        }

        #define new new(__FILE__, __LINE__)

    #endif /* __cplusplus */

#endif /* _DEBUG_MEMORY_ */

#endif /* __MY_MEM_H__ */
```

my_mem.cpp
```c++

#include <iostream>
#include <new>

#include <stdlib.h>
#include <string.h>

#include "my_mem.h"

#ifdef _DEBUG_MEMORY_

    #include <sys/types.h>
    #include <unistd.h>

    #include <glib.h>

    typedef struct {
        std::size_t size;
        char *file;
        int line;
    } debug_record_t;

    static GHashTable *hash = NULL;
    static std::size_t summary = 0;

    G_LOCK_DEFINE(hash);

#endif

// C

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _DEBUG_MEMORY_
void debug_malloc_insert(void* p, size_t size, const char* file, int line)
{
    if(hash == NULL) {
        hash = g_hash_table_new (g_direct_hash, g_direct_equal);
        // g_mutex_init (&mutex);
    }


    debug_record_t *r = (debug_record_t*)malloc(sizeof(debug_record_t));
    if(r != NULL) {
        r->size = size;
        r->file = strdup(basename((char*)file));
        r->line = line;
        G_LOCK(hash);
        g_hash_table_insert(hash, p, r);
        G_UNLOCK(hash);
    }
}

void debug_malloc_remove(void* p)
{
    if(hash != NULL) {
        G_LOCK(hash);
        debug_record_t *r = (debug_record_t*)g_hash_table_lookup(hash, p);
        if(r != NULL) {
            if(r->file != NULL) {
                free(r->file);
            }
            free(r);
        }
        g_hash_table_remove(hash, p);
        G_UNLOCK(hash);
    }
}
#endif

void *_my_malloc(size_t size, const char* file, int line)
{
    void *p = malloc (size);

#ifdef _DEBUG_MEMORY_
    debug_malloc_insert(p, size, file, line);
#endif

    return p;
}

void my_free(void *ptr)
{

#ifdef _DEBUG_MEMORY_
    debug_malloc_remove(ptr);
    _DEBUG_MEMORY_LOG("[%5d]free %p\n", getpid(), ptr);
#endif

    free(ptr);
}

void *_my_calloc(size_t nmemb, size_t size, const char* file, int line)
{
    void *p = calloc(nmemb, size);

#ifdef _DEBUG_MEMORY_
    debug_malloc_insert(p, size, file, line);
#endif

    return p;
}

void *_my_realloc(void *ptr, size_t size, const char* file, int line)
{
    void *p = realloc(ptr, size);

#ifdef _DEBUG_MEMORY_

    if(ptr == NULL) { // equivalent to my_malloc(size)
        debug_malloc_insert(p, size, file, line);
    }
    else if(size == 0) { // equivalent to my_free(ptr)
        debug_malloc_remove(ptr);
    }
    else { // real realloc
        debug_malloc_remove(ptr);
        debug_malloc_insert(p, size, file, line);
    }

#endif

    return p;
}

#ifdef __cplusplus
}
#endif

// C++

#ifdef _DEBUG_MEMORY_

static void
_summary (gpointer key,
           gpointer value,
           gpointer user_data)
{
    debug_record_t *r = (debug_record_t*)value;
    if(r != NULL) {
        summary += r->size;
    }
}

size_t debug_malloc_summary(void)
{
    summary = 0;
    G_LOCK(hash);
    g_hash_table_foreach(hash, _summary, NULL);
    G_UNLOCK(hash);
    return summary;
}

static void* func_data = NULL;

static void
_details (gpointer key,
           gpointer value,
           gpointer user_data)
{
    debug_record_t *r = (debug_record_t*)value;
    debug_malloc_detail_func func = (debug_malloc_detail_func)user_data;
    if(r != NULL && func != NULL) {
        func(r->file, r->line, r->size, func_data);
    }
}

void debug_malloc_summary_details(
                      debug_malloc_detail_func func, void* user_data)
{
    func_data = user_data;
    G_LOCK(hash);
    g_hash_table_foreach(hash, _details, (gpointer)func);
    G_UNLOCK(hash);
}

#endif
```

test.cpp
```c++
#include <iostream>
#include <new>

#include "my_mem.h"

struct MyClass {
  int data[100];
  MyClass() {std::cout << "constructed [" << this << "]\n";}
};

static void debug_malloc_detail(
                const char* file, int line, size_t size, void* user_data)
{
  printf("[%s:%d]%d\n", file, line, size);
}

int main ()
{

#ifdef _DEBUG_MEMORY_

  std::cout << "1: ";
  MyClass * p1 = new MyClass;
  printf("memory summary: %d\n", debug_malloc_summary());

  std::cout << "constructions (1): ";
  MyClass * ap1 = new MyClass[5];
  std::cout << '\n';

  printf("memory summary: %d\n", debug_malloc_summary());

  char *p2 = (char*)ama_malloc(sizeof(char) * 200);
  printf("memory summary: %d\n", debug_malloc_summary());

  debug_malloc_summary_details(debug_malloc_detail, NULL);

  delete p1;
  printf("memory summary: %d\n", debug_malloc_summary());
  delete[] ap1;
  printf("memory summary: %d\n", debug_malloc_summary());

  ama_free(p2);
  printf("memory summary: %d\n", debug_malloc_summary());


#else

  printf("memory debug not enabled.\n");

#endif

  return 0;
}
```
