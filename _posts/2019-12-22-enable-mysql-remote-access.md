---
layout: post
title: Linux下允许MySQL被远程访问
tag: [MySQL,Linux]
---

在Windows上安装MySQL，折腾了无数次，随后都是失败。无奈找了一台旧机器装个Linux，运行MySQL。但是却发现，默认的MySQL只能本地访问。

<!--break-->

# 几个核心点

## 修改bind-address

我的MySQL是通过lnmp安装的，配置文件就在/ets/my.cnf。其他情况请自行查找。

基本原则就是删除“bind-address = ”或者将其设置为“bind-address = 0.0.0.0”

## 修改iptables

检查iptable

```
sudo iptables -L --line-numbers
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    ACCEPT     all  --  anywhere             anywhere
2    ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
3    ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:ssh
4    ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:http
5    ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:https
6    DROP       tcp  --  anywhere             anywhere             tcp dpt:mysql
7    ACCEPT     icmp --  anywhere             anywhere             icmp echo-request

Chain FORWARD (policy ACCEPT)
num  target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
num  target     prot opt source               destination
```

注意，是不是有个类似上面6的东西？把它删除了。命令如下：

```
iptables -D INPUT 6
```


# 参照：

https://stackoverflow.com/questions/14779104/how-to-allow-remote-connection-to-mysql
https://unix.stackexchange.com/questions/420743/iptables-blocking-remote-mysql-remote
https://support.rackspace.com/how-to/mysql-connect-to-your-database-remotely/
