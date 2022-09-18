---
layout: post
title: 在 C++中统计动态内存分配情况
tag: [C/C++,malloc]
categories: [Program]
---

一段用于在C++中统计动态内存分配情况的测试代码。
<!--break-->

```c++
/*
 * g++ t.cpp -D_DEBUG `pkg-config glib-2.0 --libs --cflags`
 */

#include <iostream>     // std::cout
#include <new>          // ::operator new

#include <stdlib.h>
#include <glib.h>

static GHashTable *hash = NULL;
static std::size_t summary = 0;

void* operator new (std::size_t size)
{
	void *p = malloc (size);

	if(hash == NULL) {
		hash = g_hash_table_new (g_direct_hash,g_direct_equal);
	}
	g_hash_table_insert(hash, p, (gpointer)size);

	std::cout << "new " << std::hex << p << ":" << std::dec << size << "\n";
	return p;
}

void* operator new[] (std::size_t size)
{
	void *p = operator new (size);
	return p;
}

void operator delete (void* ptr)
{
	if(hash != NULL) {
		g_hash_table_remove(hash, ptr);
	}

	std::cout << "delete " << ptr << "\n";
	free (ptr);
}

void operator delete[] (void* ptr)
{
	operator delete (ptr);
}

static void
_summary (gpointer key,
           gpointer value,
           gpointer user_data)
{
	summary += (std::size_t)value;
}

void debug_malloc_summary(void)
{
	summary = 0;
	g_hash_table_foreach(hash, _summary, NULL);
	std::cout << "summary: " << std::dec << summary << "\n";
}

#ifdef _DEBUG

struct MyClass {
  int data[100];
  MyClass() {std::cout << "constructed [" << this << "]\n";}
};

int main () {

  std::cout << "1: ";
  MyClass * p1 = new MyClass;
  debug_malloc_summary();

  std::cout << "4: ";
  MyClass * p3 = (MyClass*) ::operator new (sizeof(MyClass));

  debug_malloc_summary();

  std::cout << "constructions (1): ";
  MyClass * ap1 = new MyClass[5];
  std::cout << '\n';

  debug_malloc_summary();

  delete p1;
  debug_malloc_summary();
  delete p3;
  debug_malloc_summary();
  delete[] ap1;
  debug_malloc_summary();

  return 0;
}

#endif
```
