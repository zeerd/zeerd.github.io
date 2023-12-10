---
layout: post
title: 使用 Kconfiglib 实现 menuconfig
tag: [menuconfig]
categories: [Program]
---

<!--break-->

类似 Kernel 、 toybox 、 busybox 等软件的通过 GUI 界面选择性编译的系统。

一个通用性的选择是基于 Python 的 [Kconfiglib](https://pypi.org/project/kconfiglib/) 。
它的源码发布在 [GitHub](https://github.com/ulfalizer/Kconfiglib) 上。

# 安装

对于 Ubuntu 系统，可以直接通过  `pip install kconfiglib` 来安装。

如果网络有问题，也可以手动安装：

```bash
$ git clone https://github.com/ulfalizer/Kconfiglib
$ cd Kconfiglib
$ python setup.py build
$ sudo python setup.py install
```

# 使用

基本的使用方法可以直接参考上面给出的网址。

关于 `Kconfiglib` 的作用，简单的说，就是将一系列由用户编写的的`Kconfig`文件转换成`.config`或者`config.h`。
前者可以直接被`Makefile`利用；后者可以作用于使用`C/C++`系统的软件。

当然，前者可以通过脚本解析的方式应用于更多的其他使用场景。

## KConfig

### 编写

通过合理的组织`Kconfig`文件，可以实现多级目录。

例如：

```menuconfig
menuconfig XXX_YYY
    bool "YYY of XXX"
    default n
if XXX_YYY
    menuconfig XXX_YYY_ZZZ
        bool "ZZZ of YYY"
        default y
endif # XXX_YYY
```

这样就能生成一个二级目录。当`XXX_YYY`为选中状态时，可以进入并操作二级目录中的`XXX_YYY_ZZZ`。
这种写法，会生成两个标识符，分别为`CONFIG_XXX_YYY`和`CONFIG_XXX_YYY_ZZZ`。

如果不需要一个名叫`CONFIG_XXX_YYY`的标识符，也可以直接写成：

```menuconfig
menu "YYY of XXX"
    menuconfig XXX_YYY_ZZZ
        bool "ZZZ of YYY"
        default y
endmenu
```

这种写法，只会生成`CONFIG_XXX_YYY_ZZZ`。

### 类型

Kconfig支持多种标识符类型。分别是：

* "bool" ： 布尔型
* "tristate" ： 三相
* "string" ： 字符串
* "hex" ： 16进制
* "int" ： 整数

如上面的例子中就使用了`bool`类型。

### 其他

更多使用方法可以参考Kernel的 [Kconfig Language](https://www.kernel.org/doc/html/latest/kbuild/kconfig-language.html) 。

## CMake

我暂时没找到可以让`CMake`直接利用`.config`的方法。所以，写了个脚本来解析`.config`并生成用于运行`cmake`的命令行参数：

```bash
$ OPTs=$(awk 'BEGIN{
            FS="="
        }
        {
            if(NF==2){
                if($2=="y"){
                    v="ON"
                }
                else if($2=="n"){
                    v="OFF"
                }
                else{
                    v=$2
                }
                printf("-D%s=%s ",$1,v)
            }
        }' $KCONFIG_CONFIG)
$ cmake $SRC $OPTs
```

由于`Kconfig`的数据类型中不包含“浮点数”，因此，当需要通过命令行参数传入浮点数时，可以考虑传入字符串，然后使用`string`命令删除引号。

```cmake
string(REPLACE "\"" "" CONFIG_XXX_PARAM_YYY ${CONFIG_XXX_PARAM_YYY})
```
