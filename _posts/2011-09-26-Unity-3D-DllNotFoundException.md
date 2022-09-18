---
layout: post
title: Unity 3D DllNotFoundException的一个解决方法
tags: [Unity3D,Bug]
categories: [Program]
---
客户提供了一个a.dll，我有封装了一个b.dll给unity3d调用。
<!--break-->
结果提示DllNotFoundException。

解决方法：

原本b.dll是静态加载a.dll的，改成动态加载之后，就不提示DllNotFoundException了。
