---
layout: post
title: Ubuntu系统自动删除USB网络共享的默认路由
tags: [Ubuntu,Route]
categories: [Linux]
---

我需要使用安卓手机的“USB网络共享”功能来通过`Ubuntu`系统访问手机内容。
但是，不需要使用手机网络来联网。
<!--break-->

注意：这个方法时间长了会失效。原因暂时未知。但是可以凑合用了。


但是，`Ubuntu 22.04`系统每次在检测到USB网络连接成功之后，都会自动创建一个默认的路由。

如下方法可以实现自动删除这个路由。

创建文件`/etc/NetworkManager/dispatcher.d/01-usb-network-share.sh`。
内容如下：

```bash
#!/bin/bash

# 查找所有网络接口
interfaces=$(ip -o link show | awk -F': ' '{print $2}')

# 查找 USB 网卡接口（以 enx 开头）
usb_interface=""
for iface in $interfaces; do
    if [[ $iface == enx* ]]; then
        usb_interface=$iface
        break
    fi
done

# 检查是否找到 USB 网卡接口
if [ -z "$usb_interface" ]; then
#    echo "未找到 USB 网卡接口。"
    exit 1
fi

# 从默认路由中删除 USB 网卡
sudo ip route del default dev $usb_interface
```

为文件添加可执行权限：`sudo chmod +x /etc/NetworkManager/dispatcher.d/01-usb-network-share.sh`

重启 `NetworkManager` 服务：`sudo systemctl restart NetworkManager`
