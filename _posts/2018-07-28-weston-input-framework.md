---
layout: post
title: Weston输入框架简析
tag: [Weston,Input]
categories: [Linux]
---


<!--break-->

提到输入，自然离不开两个关键组件：

1. 提供输入信息的设备：鼠标、键盘、触摸屏；
2. 接收输入信息的应用程序。

---

在基于Wayland-IVI-Extension的Wayland/Weston系统中，还引入了两个组件：

1. Weston自身：提供基本的输入功能；
2. ivi-input-controller：提供焦点管理等扩展功能。

---

除此之外，还有一个任何涉及到输入都避不开的Wayland协议：wl_seat。

---

**输入设备**

Weston可以通过两种方式接入输入设备。

我们知道，对于一个人机交互系统来说，输入设备是无法脱离输出设备而单独存在的。每个输入设备都要绑定到它所控制的那个输出设备上。在Weston启动的初期，Weston会在创建了输出设备之后，立刻遍历所有现存的输入设备，并根据预设的条件将对应自己的输入设备进行标记和绑定。

而对于热插拔的输入设备或者初始化较慢的输入设备，Weston还提供了监控机制。在新的输入设备产生之后，主动将这些输入设备绑定到输出设备上。

---

**应用程序**

顾名思义，就是那些将要接收输入信息并进行处理的应用程序。

应用程序注册到Weston上之后，会接收到多个Global Handler。其中有一项就是wl_seat，这个Handler将会帮助应用程序建立于输入设备的连接。

应用程序根据需要，从Weston获取输入设备的handle，并使用handle注册不同的输入设备的Listener函数，用于监听设备的输入信息。

---

**Weston**

一旦应用程序从Weston获取输入设备的Handle，Weston就会把这个应用程序记录到对应的输入设备的resource_list中。同时，Weston还会为每一个输入设备维护一个focus_resource_list，当某一应用程序获得了输入焦点之后，这个应用程序就会从resource_list移动到focus_resource_list之中。

当用户操作输入设备进行输入时，Weston会根据这两个list决定是否将输入设备的信息发送给那个应用程序，即便这个应用程序的窗口处于输入区域。

实际上这里就存在一个风险，一旦存在多个输出设备，每个输出设备都拥有自己独立的输入设备时，如果这些输出设备和输入设备和resource_list的对应关系出现了错误，就会发生输入无效的问题。

---

**ivi-input-controller**

当我们激活Wayland-IVI-Extension的ivi-input-controller功能之后，这个机能模块就会插入到Weston和应用程序之间。也就是说，原本直接从Weston发送给应用程序的输入信息会经过ivi-input-controller的focus机制进行筛选之后才会进行中转。

因此，如果ivi-input-controller的focus机制出现问题，也会导致用户输入无效的问题。我们在实际使用中曾经遇到过一个问题。在应用程序没有获取输入设备的Handle之前，就调用了ivi-input-controller的focus接口。导致Weston内部的resource_list和ivi-input-controller内部的focus信息不一致，最终造成用户输入无效。




