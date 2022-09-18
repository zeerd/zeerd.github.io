---
layout: post
title: 安装Ubuntu16.04过程中找不到CD-ROM
tag: [Ubuntu]
categories: [OperatingSystem]
---

今天打算在一台安装了Windows10专业版的笔记本上安装Ubuntu 16.04的服务器版。

结果遇到了一个恶心的额问题，<!--break-->安装过程中提示：

```无法挂载你的安装光盘，有可能是因为光盘并不在驱动器中，如果是这样请你插入光盘并重试，再次尝试挂载光盘吗？ ```

在中文区搜索未果，只好退出安装切换到英文版，然后按着英文版的提示重新进行google，最终在如下网页找到了一个貌似靠谱的对策：

http://askubuntu.com/questions/671159/bootable-usb-needs-cd-rom



但是，原帖给出的方案并无法在我的机器上发挥作用。在我的尝试中，如果先进行mount，然后在点击“NO”，会导致刚刚成功mount上的cdrom被再次umount掉。经过一番尝试，最终确定的方案如下：

所以，正确的操作顺序是：

1. 点击“NO”回到菜单
2. 按Alt+F2
3. 进入到一个新的命令行终端
4. mkdir /media/usb
5. mount -t vfat /dev/sda1 /media/usb
6. mount -o loop path/to/iso/file/UBUNTUSERVER.ISO /cdrom
7. 跳过“Detect and Mount CD-ROM”，选择下一项

