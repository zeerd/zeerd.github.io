---
layout: post
title: 通过远程桌面连接虚拟机内的win10
tag: [VirtualBox,Remote-Desktop]
categories: [Linux,OperatingSystem]
---

Virtualbox自身在“显示”中存在一个远程桌面 ，也是使用的3389端口。但是，这个远程桌面使用的是Virtualbox的VRDP服务，而不是Win10自身的远程桌面服务。因此，它是没有用户验证的，也就是说，任何人只要知道了机器的IP地址，就可以访问这台Win10。

<!--break-->
如果希望使用真正的远程桌面功能，可以通过“端口转发”来实现。在“网络”设置的“高级”中可以设置端口转发。

但是，这个时候需要注意一件事情。Win10安装好之后，默认网络连接类型可能是“专用网络”，也可能是“公用网络”。而在“公用网络”中，防火墙默认是禁止远程桌面功能的。我在这个地方卡了很久。远程连接总是提示“内部错误”。最后才发现，是被防火墙禁止了。

