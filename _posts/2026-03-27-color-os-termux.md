---
layout: post
title: ColorOS(Android16) 运行 Termux/Ubuntu
tags: [Termux]
categories: [Android]
---

在`Termux`中基于`proot-distro`运行`ubuntu`，手机一熄屏，`Termux`就被`kill -9`了。解决方案：

<!--break-->

1. 关闭电池优化：

* 打开手机 设置 > 电池 > 应用电池用量（或“应用耗电管理”）。
* 找到 Termux，将其设置为 “允许后台运行” 或 “允许完全后台行为”（不要选“智能控制”或“自动优化”）。

2. 锁定后台任务：

* 打开 Termux，然后进入手机的 “最近任务” 视图（多任务切换界面）。
* 找到 Termux 的卡片，点击右上角的菜单（或长按卡片），选择 “锁定”（通常会显示一个小锁图标）。这样一键清理内存时不会误杀它。

3. Termux 内部配置：获取唤醒锁

即使系统允许后台，CPU 休眠也可能导致进程挂起。你需要让 Termux 申请“唤醒锁”。
打开 Termux，安装 API 包：
```bash
pkg install termux-api
termux-wake-lock
```

执行后，系统会弹窗询问是否允许 Termux 忽略电池优化，请务必点击 “允许”。

4. ADB 解除“幽灵进程”限制

```bash
# 1. 禁用设备配置的同步延迟限制（让设置立即生效）
adb shell device_config set_sync_disabled_for_tests persistent
# 2. 将最大幽灵进程数修改为极大值（默认通常只有32-64）
adb shell device_config put activity_manager max_phantom_processes 65536
```
