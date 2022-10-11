---
layout: post
title: 借助VNC实现Ubuntu系统的远程桌面
tag: [VNC,Ubuntu]
categories: [OperatingSystem]
---

<!--break-->

# 准备

## 组件安装

```
sudo apt install xfce4 tigervnc-standalone-server
```

我不确定是否还有其他依赖，但这两个是需要的。

* 注意：一定要使用tigervnc不要使用tightvnc。后者太古老了，可能会导致display功能失效。
* 安装过程中，会提示选择使用的窗口管理器。如果后续打算使用xfce4为本地的窗口管理系统，则需要选择“lightdm”，否则选择默认的"gdm3"。后续也可以通过sudo dpkg-reconfigure gdm3命令修改。

## 配置修改

修改 ~/.vnc/xstartup:

```
#!/bin/bash
[ -r $HOME/.Xresources ] && xrdb $HOME/.Xresources
export PULSE_SERVER=127.0.0.1
XAUTHORITY=$HOME/.Xauthority
export XAUTHORITY
LANG=en_US.UTF-8
export LANG
echo $$ > /tmp/xsession.pid
dbus-launch --exit-with-session startxfce4 &
```

修改 /etc/vnc.conf ：

在其中查找“$localhost”的配置区，并添加：

```
$localhost = "no";
```

在其中查找“$geometry”的配置区并修改为实际的分辨率。


# 运行

```
$ vncserver
```

结果大概如下所示：

```
$ ps aux | grep vnc
coc xxxx  0.7  1.4 1152700 114184 pts/0  Sl   09:36   0:07 /usr/bin/Xtigervnc :1 -desktop xxxxx:1 (coc) -auth /home/user/.Xauthority -geometry 1900x1200 -depth 24 -rfbwait 30000 -rfbauth /home/user/.vnc/passwd -rfbport 5901 -pn -SecurityTypes VncAuth,TLSVnc

$ netstat -anp | grep 5091
tcp        0      0 0.0.0.0:5901            0.0.0.0:*               LISTEN      257705/Xtigervnc
```

如果在命令函参数中看到了“-localhost”的字样或者在`netstat`的结果中没看到“0.0.0.0:5091”，可以检查一下`vnc.conf`文件是否正确。

使用如下命令可以关闭服务：

```
vncserver -kill :1
```

# 连接

可以使用vncviewer64或其他任何具有VNC连接功能的客户端进行连接。

如果不想使用额外的客户端软件，还可以直接使用Windows的远程桌面。不过这样要在Ubuntu上安装额外的服务。

```
sudo apt install xrdp
```

然后，可以通过修改“`/etc/xrdp/xrdp.ini`”来调整连接端口等。登录时，可以选择“Xorg”来使用Ubuntu默认的Unity桌面，也可以选择“vnc-any”来连接前面安装的Xfce4桌面。

如果在display中找不到适合自己显示器的分辨率，可以修改Ubuntu机器上“`~/.config/xfce4/xfconf/xfce-perchannel-xml/displays.xml`”中的分辨率。然后重启vncsever。

# 中文支持

Xfce4中的设置权限存在问题，需要从命令行启动“Language Support”，运行`sudo /usr/bin/gnome-language-selector`。在其中按着常规操作添加中文即可。

如果环境下不能自动启动输入法程序，则需要在命令行手动执行`ibus-daemon -d`来启动输入法。同样的，默认的输入法可能只有英文，在状态栏的“EN”上点击右键，选择“Preferences”，添加拼音输入法。输入法通常是早已经安装好了的，和Unity桌面下的相同。如果没有的话，可以考虑安装`sunpinyin`， [参考](/support-CN-under-xfce/)。
