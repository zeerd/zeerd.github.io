---
layout: post
title: 在Termux中通过openbox搭建桌面环境运行RDP进行远程桌面连接
tags: [Termux, Openbox]
categories: [Android]
---

以最省资源为目的搭建环境。目标手机只有`4G`内存。常规的`Xfce4`/`Remmina`方案跑不动。
于是切换成更省内存的`Openbox`/`xfreerdp`方案。

<!--break-->

更换源，加速`pkg`：
```bash
termux-change-repo
```

必须先独立安装`x11-repo`，然后才能安装`tigervnc`、`openbox`、`freerdp`等软件包：
```bash
pkg update && pkg upgrade -y
pkg install x11-repo -y
```

有些应用会使用`perl`，默认连外网非常慢。切换源加速`CPAN`：
1. 进入`CPAN`交互模式
```bash
cpan
```
2. 添加国内镜像并保存
在 cpan[1]> 提示符下，逐行输入以下命令（以阿里云为例）：
```bash
o conf urllist push https://mirrors.aliyun.com/CPAN/
o conf commit
quit
```

继续安装其他软件包：
```bash
pkg install tigervnc openbox freerdp aterm -y
```

配置 `VNC`：
```bash
cat > ~/.vnc/xstartup <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
openbox-session &
EOF
chmod +x ~/.vnc/xstartup
```

启动 `VNC`(16位色深更省内存)：
```bash
vncserver -geometry 1280x720 -depth 16 :1
```

使用电脑或其它设备连接`VNC`。

默认`Openbox`的桌面是空的，看起来好像是启动失败了。其实就长这样。
在桌面右键 → 打开终端（Terminal），然后运行：
```bash
export DISPLAY=:1
xfreerdp /v:Windows的IP /u:用户名 /p:'密码' +clipboard /cert:ignore /size:1280x720 /clipboard:use-selection:PRIMARY &
```
注意：`aterm`的剪贴板操作是X11的左键选中复制、中键粘贴。和绝大多数应用都不兼容。目前发现可用的图形版编辑器是`mousepad`，如果确实需要可以安装。

最终运行时的内存使用情况大概如下(粗略估计<250M)：

|  RES |  SHR | COMM     |
| ---- | ---- | -------- |
| 125M |  16M | xfreerdp |
|  33M |  14M | Xvnc     |
|  21M |  15M | openbox  |
| 5.2M | 4.7M | xiccd |
| 4.9M | 3.7M | bash |
| 4.6M | 3.8M | top -s 10 |
| 2.0M | 1.7M | gpg-agent |
| 1.4M | 796K | dbus-launch |
| 1.4M | 800K | dbus-daemon |

---

如果觉得`Openbox`桌面太单调了，而且内存还有余量，可以适当安装些其他组件。比如`tint2`是一个简易任务栏（内存占用~19M）。
```bash
pkg install tint2
echo "tint2 &" >> ~/.config/openbox/autostart
```

一个简单的文件管理器（内存占用~34M、非常驻）：
```bash
pkg install pcmanfm -y
```

一个可以临时凑合用一下的浏览器：
```bash
pkg install netsurf -y
```

调整`Openbox`默认右键菜单：
```bash
pkg install vim
cp ../usr/etc/xdg/openbox/menu.xml ~/.config/openbox/
vim ~/.config/openbox/menu.xml
openbox --reconfigure
```

---

当然，最关键的还是要关闭手机的幽灵进程清理功能：
```bash
adb shell settings put global settings_enable_monitor_phantom_procs false
```
