---
layout: post
title: Meson & Ninja
tag: [Meson,Ninja]
---


## 交叉编译

最近跟多软件包都转向Meson编译系统了。有一说一，meson的指导文档，至少在交叉编译这块，就是一坨屎。

经过很多尝试，又去很多不同的第三方工程里面抄了很多例子之后，总算是凑出来了一个可用的版本。

<!--break-->

目前来看，下面的配置文件对于64位的arm系统生效了。注意要使用meson-0.54.0版本。0.53.2版本不行。

```
[binaries]
c = '/path/to/yocto-sdk/sysroots/x86_64-pokysdk-linux/usr/bin/aarch64-poky-linux/aarch64-poky-linux-gcc'
cpp = '/path/to/yocto-sdk/sysroots/x86_64-pokysdk-linux/usr/bin/aarch64-poky-linux/aarch64-poky-linux-g++'
ar = '/path/to/yocto-sdk/sysroots/x86_64-pokysdk-linux/usr/bin/aarch64-poky-linux/aarch64-poky-linux-ar'
strip = '/path/to/yocto-sdk/sysroots/x86_64-pokysdk-linux/usr/bin/aarch64-poky-linux/aarch64-poky-linux-strip'
pkgconfig = '/path/to/yocto-sdk/sysroots/x86_64-pokysdk-linux/usr/bin/x86_64-pokysdk-linux-gnu-pkg-config'
cmake = 'cmake'
#pcap-config = ''

[properties]
skip_sanity_check = true
sys_root = '/path/to/yocto-sdk/sysroots/aarch64-poky-linux'
c_args = ['--sysroot=/path/to/yocto-sdk/sysroots/aarch64-poky-linux', '-O2', '-pipe', '-g', '-feliminate-unused-debug-types']
c_link_args = ['--sysroot=/path/to/yocto-sdk/sysroots/aarch64-poky-linux', '-Wl,-O1', '-Wl,--hash-style=gnu', '-Wl,--as-needed']
cpp_args = ['--sysroot=/path/to/yocto-sdk/sysroots/aarch64-poky-linux', '-O2', '-pipe', '-g', '-feliminate-unused-debug-types']
cpp_link_args = ['--sysroot=/path/to/yocto-sdk/sysroots/aarch64-poky-linux', '-Wl,-O1', '-Wl,--hash-style=gnu', '-Wl,--as-needed']
pkg_config_libdir ='/path/to/yocto-sdk/sysroots/aarch64-poky-linux/usr/lib/pkgconfig'

[host_machine]
system = 'linux'
cpu_family = 'aarch64'
cpu = 'aarch64'
endian = 'little'

[target_machine]
system = 'linux'
cpu_family = 'aarch64'
cpu = 'armv8a'
endian = 'little'
```

将上述内容保存成类似叫做arm.txt的文件。然后运行：

```
$ meson arm64-build --prefix=/usr/local --cross-file arm.txt
```

编译：

```
$ ninja -C arm64-build
```

安装（如果需要指定安装位置，则需要使用DESTDIR这个环境变量）：

```
$ sudo DESTDIR=/path/to/install ninja -C arm64-build install
```

注意：你的环境变量可能会影响meson的运行。确保CC这类的环境变量指向的是Native的编译器。而不是交叉编译器。

## 使用最新版的Meson

直接安装的Meson可能存在版本延后。如果想要使用最新版本的Meson中的特性，那么就需要去GitHub下载Meson的源码。

Meson是使用Python编写的，这个软件本身不需要安装。直接执行就可以了。例如：

```
user@user:~/tools$ git clone https://github.com/mesonbuild/meson.git
user@user:~/tools$ pwd
/home/user/tools/
user@user:~/tools$ cd /path/to/libavtp
user@user:/path/to/libavtp$ /home/user/tools/meson/meson.py build
```

## 其他

cross-file.txt中的cpu是被对应软件包的meson.build文件使用的，而不是被meson系统本身使用的。也就是说，如果第三方软件包本身不使用cpu这个项目中的字符串，那就可以随便瞎写。

否则就要去读meson.build或者去问第三方软件包的开发人员，虽然这未必会有结果。

## 参考

https://gitlab.collabora.com/snippets/51

https://github.com/DPDK/dpdk/blob/master/config/arm/arm64_armv8_linux_gcc

https://github.com/mesonbuild/meson/tree/master/cross

https://github.com/mesonbuild/meson/issues/7037

