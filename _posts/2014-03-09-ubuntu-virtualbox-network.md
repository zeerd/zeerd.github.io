---
layout: post
title: Ubuntu下实现virtualbox虚拟机与真机网络互访
tags: [Ubuntu,VirtualBox,Network]
---

因为有些时候我们需要在windows和ubuntu之间进行切换，所以一些编译环境可能就需要被创建在一个ubuntu的虚拟机中。

这样，就需要我们在windows和ubuntu下都可以方便的对虚拟机进行各种访问。

<!--break-->

Windows下的方法是依赖与Microsoft Loopback Adapter实现的，不是本文的重点。
下面具体介绍一下，如何在ubuntu系统下进行配置，以便实现真机的ubuntu系统和虚拟机中的ubuntu系统可以通过网络方便的互联。


1. 首先，在真机的Ubuntu中安装含有建立虚拟网络设备 ( TAP interfaces ) 的工具 uml-utilities 和桥接工具 bridge-utils的环境，需要安装两个软件包：

```
sudo apt-get install uml-utilities
sudo apt-get install bridge-utils
```

为了使你的虚拟机能够访问网络接口，你必须将运行虚拟主机的用户的用户名（通常是你的ubuntu登录用户名）添加到uml-net用户组（请用你的用户名替换其中的“vboxuser”）：

```
sudo gpasswd -a vboxuser uml-net
```

注意：为了使改动生效，请重新启动你的计算机。（如果不想重启也可以尝试：`sudo tunctl -u root -t tap0`）
注意2：这两个软件包是我参照网上一个信息安装的，但是实际的使用过程中我不确定bridge-utils是否真的必要。

2. 向你的真机Ubuntu操作系统描述你要添加的虚拟网络设备，编辑 /etc/network/interfaces：

```
sudo vim /etc/network/interfaces
```

内容如下：

```
auto tap0
iface tap0 inet static
address 172.0.0.1
netmask 255.255.0.0
network 172.0.0.0
broadcast 172.0.0.255
```

2. 启动虚拟机之前，通过ifconfig命令设置tap0的IP：

```
ifconfig tap0 172.0.0.1
```

其中的ip等信息请根据自己的需要进行调整。

3. 让 virtualbox 使用这个虚拟网络接口

默认的第一块网卡使用NAT不变。保证虚拟机可以正常访问外网。

增加第二快网卡，链接方式选择“桥接网卡”，界面名称选择新创建的“tap0”。

4. 启动并配置你的虚拟机。

此时因为网络配置可能有问题，所以第一次启动速度会很慢，以后就会好了。
启动成功之后，手动编辑虚拟机中的/etc/network/interfaces：

```
sudo vim /etc/network/interfaces
```

内容如下：

```
auto eth0
iface eth0 inet dhcp

auto eth1
iface eth1 inet static
address 172.0.0.2
netmask 255.255.0.0
```

其中的ip等信息请根据自己的需要进行调整。

以上文章涉及到的系统：
真机： Ubuntu Desktop 13.10
虚拟机：Ubuntu Server 12.10

配置的过程参照了如下互联网资源：
http://blog.csdn.net/solo_lxy/article/details/4360360

补充：

在Ubuntu20.04中，引入了NetPlan来完成网络的设置。

可以添加一个新的配置文件，例如：

```
sudo vim /etc/netplan/50-tap0.yaml
```

内容类似如下：

```
network:
    ethernets:
        enp0s8:
            dhcp4: false
            addresses: [172.0.0.2/24]
            optional: true
            gateway4: 10.0.2.2
            nameservers:
                addresses: [8.8.8.8]
    version: 2

```
