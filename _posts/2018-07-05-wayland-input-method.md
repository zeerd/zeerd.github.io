---
layout: post
title: Wayland中的输入法框架初探
tag: [Wayland,Weston,InputMethod]
---
<!--break-->

Weston中，关于输入法部分的接口协议如下表所示（wayland-1.14）：

| XML                          | Interface                   | 解释                                       |
| ---------------------------- | --------------------------- | ---------------------------------------- |
| text-input-unstable-v1.xml   | -                           | 用于Application端的输入法协议。                    |
|                              | zwp_text_input_manager_v1   | 用来创建zwp_text_input_v1。没有太多需要解释的。         |
|                              | zwp_text_input_v1           | 输入法协议核心。这个接口没有注册到Global Handle中。只能通过zwp_text_input_manager_v1创建。 |
| input-method-unstable-v1.xml | -                           | 仅用于软键盘端的协议。                              |
|                              | zwp_input_method_context_v1 | 可以看到，里面大部分接口都和zwp_text_input_v1类似且功能相反。因为中间要由Weston做一次消息传递和角色转换。这个借口并没有注册到Global Handle中，所以以它只能被其他方法创建。 |
|                              | zwp_input_method_v1         | 激活或取消输入法。这个接口可以用于获取zwp_input_method_context_v1的实例。 |
|                              | zwp_input_panel_v1          | 用于获取zwp_input_panel_surface_v1。          |
|                              | zwp_input_panel_surface_v1  | 对软键盘窗口的控制接口，这个接口同样没有注册到Global Handle中。   |



在复杂系统中，软键盘和应用程序通常都是运行在不同的进程之上。那么，当用户进行输入时，就涉及到进程间通讯：或者应用程序与软键盘直接建立连接；或者存在一个中间人进行传话。

在Wayland的设计体系中，Weston就是充当了这个中间人的角色。这个中间人即weston中的text-backend。这个text-backend没有独立的so，而是作为weston可执行文件的一部分而存在。

从上面的协议可以看到，应用程序通过text-input协议与Weston相连，Weston再通过input-method协议与软键盘相连。从而实现了应用程序到软键盘的连通。



下面记录一些看代码过程中遇到的专用名词的信息：


| 名词                      | 解释                                       |                                          | 参考链接                                     |
| ----------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Preedit text            | 在输入的结果没有最终确定之前是可以更改的。大部分输入法，在确定之前都会在已输入文字的下方描画一个下划线或者波浪线，表示这部分文字还没有正式确定。当我们通过键盘移动光标时，这部分文字可以被删除、添加等等操作。这些文字就是所谓的preedit text。 | With every new key pressed, the input method will try to create a matching string for the text typed so far called preedit string. While the input context is active, the user can only move the cursor inside the string belonging to this input context. | [Refer](http://ftp.ics.uci.edu/pub/centos0/ics-custom-build/BUILD/PyQt-x11-gpl-4.7.2/doc/html/qinputmethodevent.html) |
| Surrounding text        | 如果是简单的输入框，Surrounding Text就是输入框之中原本就有的文字。如果是富文本或者编译器这类的，暂时还不确定要如何表现。 | Surrounding text is a feature that allows input methods to query the text and cursor position in the current text input field and also to delete part of that surrounding text. | [Refer](http://www.nongnu.org/m17n/manual-en/m17nDBTutorial.html#im-surrounding-text) |
| delete surrounding text | 如果目前存在preedit字符串，则按下BackSpace删除preedit的最后一字符。当Preedit为空，就会触发这个操作。用来删除输入框中原有的字符。 |                                          |                                          |
| commit string           | 1、拼音全部装换成汉字之后的最终结果；2、当发送preedit string时，可能会附带commit string。表示有一部分preedit的内容已经被确认过了（比如输入了五个汉字的拼音，其中前面两个拼音已经传换成汉字了）。此时如果失去焦点，就会用commit string替换preedit string显示在输入框中。 |                                          |                                          |






