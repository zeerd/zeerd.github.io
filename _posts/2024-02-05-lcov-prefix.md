---
layout: post
title: 在非编译环境中运行测试程序并获取正确的覆盖率报告
tag: [GCC,Gcov]
categories: [Program]
---

本文针对`GCOV_PREFIX`和`GCOV_PREFIX_STRIP`的使用进行一些记录。

<!--break-->

首先，准备一个简单的 C 语言程序作为测试目标。

```c
#include <stdio.h>
#include <stdlib.h>

int foo(int a)
{
    return a * a;
}

int main(int argc, char const *argv[])
{
    printf("%d\n", foo(atoi(argv[1])));
    return 0;
}
```

在最简单的情况下，我们的情况会类似于下面的脚本。
即编译环境和运行环境都在一起。

这种情况下，只要参数设置没有问题，就可以简单的获取对应的覆盖率报告。


```bash
#!/bin/bash

gcc main.c -o test -lgcov -coverage
./test 2

lcov -c -d $(pwd) -o test.info
genhtml test.info -o doc
```

但是，很多情况下，我们都需要将测试程序移动到其他环境中运行。
比如下面的脚本模拟了在`Docker`中运行测试程序的情况。

简单的运行一下，我们会发现，覆盖率报告生成失败了。
原因是， `lcov` 找不到 `.gcda` 文件。


```bash
#!/bin/bash

gcc main.c -o test -lgcov -coverage

docker run -v $(pwd):/home/test \
    ubuntu:20.04 /home/test/test 2

lcov -c -d $(pwd) -o test.info
genhtml test.info -o doc
```

解决的方法也很简单。在目标环境中设置`GCOV_PREFIX`和`GCOV_PREFIX_STRIP`这两个环境变量。
其中：

* `GCOV_PREFIX` 是测试程序运行的位置。
* `GCOV_PREFIX_STRIP` 是编译测试程序时，源代码所在路径的深度。


```bash
#!/bin/bash

gcc main.c -o test -lgcov -coverage

echo "#!/bin/bash" > startup.sh
echo "export GCOV_PREFIX=/home/test" >> startup.sh
echo "export GCOV_PREFIX_STRIP=\$(echo $(pwd) | awk -F\"/\" '{print NF-1}')" \
     >> startup.sh
echo "/home/test/test 2" >> startup.sh
chmod +x startup.sh
docker run -v $(pwd):/home/test -w /home/test \
    ubuntu:20.04 /home/test/startup.sh

lcov -c -d $(pwd) -o test.info
genhtml test.info -o doc
```

上述例子其实还不够精准的描述更加复杂的情况。
例如，当我们需要在多个`Docker`中并行运行同一段代码时（这种情况常见于动态链接库），
同时运行的程序会竞争`.gcda`文件。引发写冲突破坏`.gcda`文件。
为了避免类似的问题，我们可能需要将测试程序拷贝多份。

参照下面的脚本，我们将编译出来的测试程序移动到了源代码以外的路径（`new`），去执行
（脚本并没有模拟并行运行的情况，毕竟测试程序太简单了，一瞬间就退出了）。

这种情况下，直接执行测试程序，就会由于缺少信息而无法生成覆盖率报告。
这些信息其实是保存在`.gcno`文件中。

参照下面的脚本，将`main.gcno`同样复制到新的路径下，然后再次运行测试程序。
覆盖率报告可以顺利的生成了。


```bash
#!/bin/bash

gcc main.c -o test -lgcov -coverage
install -d new
install test new

echo "#!/bin/bash" > new/startup.sh
echo "export GCOV_PREFIX=/home/test" >> new/startup.sh
echo "export GCOV_PREFIX_STRIP=\$(echo $(pwd) | awk -F\"/\" '{print NF-1}')" \
     >> new/startup.sh
echo "/home/test/test 2" >> new/startup.sh
chmod +x new/startup.sh

cp main.gcno new/
docker run -v $(pwd)/new:/home/test/ -w /home/test \
    ubuntu:20.04 /home/test/startup.sh

lcov -c -d $(pwd)/new -o test.info
genhtml test.info -o doc
```

简单总结一下。

某工程代码的存放路径为`/path/to/proj`，其中有一个源文件存放在`a/b.c`。
编译生成的`a.out`转移到目标系统的`/usr/bin`下运行。

此时，需要进行如下工作：

* 将`/path/to/proj/a/b.gcno`复制到目标环境的`/usr/bin/a/b.gcno`；
* 设置环境变量`GCOV_PREFIX=/usr/bin`；
* 设置环境变量`GCOV_PREFIX_STRIP=3`。（`/path/to/proj`是三层）。

运行时，`a.out`会根据调试信息去寻找`/path/to/proj/a/b.gcno`。
但是，由于设置了`GCOV_PREFIX`，这个目标会调整为`/usr/bin/path/to/proj/a/b.gcno`。
然后，由于设置了`GCOV_PREFIX_STRIP`，将`/usr/bin/`后面的三级路径删除，变成了
`/usr/bin/a/b.gcno`。
在这里，`a.out`找到了我们提前复制进去的`b.gcno`文件。
并在同样的位置生成`/usr/bin/a/b.gcda`文件。

有了`.gcno`和`.gcda`文件，就可以生成测试报告了。
