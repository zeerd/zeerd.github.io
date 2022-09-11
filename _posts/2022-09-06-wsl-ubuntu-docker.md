---
layout: post
title: 在WSL2中安装和使用Ubuntu
tags: [WSL2,Ubuntu,Docker]
---

记录一些遇到的问题。以后可能会实时更新。

<!--break-->

## Docker相关

在Ubuntu 22.04中，dockerd 无法运行。提示：

```
INFO[2022-09-06T15:47:48.796157700+08:00] stopping healthcheck following graceful shutdown  module=libcontainerd
failed to start daemon: Error initializing network controller: error obtaining controller instance: unable to add return rule in DOCKER-ISOLATION-STAGE-1 chain:  (iptables failed: iptables --wait -A DOCKER-ISOLATION-STAGE-1 -j RETURN: iptables v1.8.7 (nf_tables):  RULE_APPEND failed (No such file or directory): rule in chain DOCKER-ISOLATION-STAGE-1
 (exit status 4))
```

[解决方案](https://github.com/microsoft/WSL/issues/6655#issuecomment-1142933322)：

```
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

sudo dockerd &
```