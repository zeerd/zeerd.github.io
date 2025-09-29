---
layout: post
title: 一款表现良好的中英文混合编程字体——Sarasa Gothic
tag: [Font]
categories: [OperatingSystem]
---

<!--break-->

网上可以找到的绝大部分常用的字体推荐文章中最常出现的一些字体（比如： Heck 、 Consolas 、 Inconsolata 等等）其实对于中文字体的支持都是没有的。在注释中制造表格时，总是参差不齐的。

微软官方的几款中文字体（比如：仿宋、宋体等）又存在“;”和“:”很难分清的问题。

另一款最常被提及的字体“ YaHei Consolas Hybird ”其实也存在英文和数字在小尺寸时不清晰的问题。 比如“e”的中线、“1”的底线异常的厚。

直到后来，我找到了“Sarasa Gothic”。

从 [官网](https://github.com/be5invis/Sarasa-Gothic) 下载Release包，有200多M。 解压缩出来更是有惊人的十几个G。

这里面包含了大概40多组不同的字体。其中，仅简体中文字体就有10组。因此，当然并不需要全部使用。

目前，我个人使用的是“sarasa-fixed-sc”开头的一组字体。

在我最常用的代码编辑软件“ sublime-text ”的配置文件中，直接填写：

```json
"font_face":"Sarasa Fixed SC", // ，。 , . ; : e o O 0 l I 1
"font_size": 10,
```

可以看到，至少，我最关心的几个符号都是清晰可辨识的。
