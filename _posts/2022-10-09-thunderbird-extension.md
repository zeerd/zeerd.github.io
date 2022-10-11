---
layout: post
title: 打包 thunderbird 扩展
tag: [Extension]
categories: [Applications]
---

打包本地扩展来使用。

<!--break-->

其实很简单。但是时间长不用就会忘记，然后又要花很长时间去找。干脆记下来吧。

进入到插件目录，如`InsertSignature`。执行：

```bash
zip -r ../InsertSignature.zip .
mv ../InsertSignature.zip ../InsertSignature.xpi
```

另外，将扩展的“允许自动更新”关闭。否则重启雷鸟时，对应的插件可能会被删除（原因未知）。
