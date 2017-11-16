---
layout: post
title: Linux中非root账户免密执行高权限命令
tag: [sysctl,sudo,non-root,linux]
---

最近在Jenkins中编译Yocto工程，经常发生内存不足导致的编译失败的情况。而每次只要执行一下
```shell
sysctl -w vm.drop_caches=3
```
就可以编译成功。
<!--break-->

因此，我们需要Jenkins具备自身drop caches的能力。但是，jenkins不是root账户，即便给他添加sudo权限，我们也不便于在脚本中输入sudo的认证密码。

经过调查，下面方法可以有助于解决这个问题：

1. 在/etc/sudoers.d/下建立一个配置文件，例如：/etc/sudoers.d/jenkins-drop-caches
2. 编辑期内容：
```shell
%jenkins ALL=NOPASSWD: /sbin/sysctl -w vm.drop_caches=3
```
   注意，sysctl必须是绝对路径。
3. 将这个文件的权限修改为0440
4. 在jenkins的构建脚本的开头加入
```shell
sudo /sbin/sysctl -w vm.drop_caches=3
```
   同样的，这里的sysctl也必须是绝对路径，且与sudoers.d中的配置文件完全相同。


然后测试一下，使用
```shell
sudo su jenkins
```
命令切换到jenkins账户，然后执行
```shell
sudo /sbin/sysctl -w vm.drop_caches=3
```
可以看到，drop caches命令被执行且没有询问密码。



Refer:

[allowing user to run systemctl/systemd services without password](https://askubuntu.com/questions/692701/allowing-user-to-run-systemctl-systemd-services-without-password)
