---
layout: post
title: 【翻译】DDS与SOME/IP
tag: [DDS,SOME/IP]
---

翻译[自](https://stackoverflow.com/questions/51182471/whats-the-difference-between-dds-and-some-ip)。

感觉原文作者是一个DDS的扈拥，字里行间都在贬低SOME/IP。所以，看看就好。

<!--break-->

| |SOME/IP|DDS|Notes|
|概念|SOME/IP和DDS都允许分布式应用程序使用发布/订阅模式和服务请求/回复模式（RPC）进行通信。 但是也存在重大差异。 SOME/IP专为汽车行业设计。 SOME/IP是作为AUTOSAR一部分而开发的一系列规范，描述了其序列化协议，服务发现以及集成在Classic AUTOSAR中的协议标准接口。|DDS（数据分发服务）的目标是更广泛的工业物联网领域。它是对象管理组（OMG）发布的一系列开放标准。它是专为分布式实时系统设计的，并用于[许多行业](http://portals.omg.org/dds/who-is-using-dds-2)，包括交通，能源，医疗系统，工业自动化，航空航天和国防等。在商业和开源领域都有许多独立的实现。 DDS系列的第一个规范于2004年发布，此后已发展为一组[12个DDS标准](http://portals.omg.org/dds/omg-dds-standard/)，其中包括标准线协议（DDS-RTPS），API（DDS-PSM-CXX，DDS-PSM-JAVA以及从IDL到C，Ada等的映射），类型系统（DDS-XTYPES），数据传递模式（DDS用于以数据为中心的发布-订阅，用于请求答复的DDS-RPC），安全性（DDS-SECURITY），系统描述（DDS-XML），数据建模（IDL）和其他通信框架的网关（DDS-WEB，DDS-OPCUA和DDS-XRCE）。 | |
|通讯方式|SOME/IP可以看作是基于对象的面向服务的体系结构。通过实例化的服务对象将信息提供给系统，客户端应用程序可以访问这些信息。客户端应用程序会为其需要访问的每个服务实例实例化相应的“代理”对象。 客户端应用程序通过将代理对象附加到服务对象并使用它来监视事件和字段更改来订阅信息。 他们还可以在服务对象上调用操作以执行远程过程调用或读取/写入特定字段。|DDS从根本上提供了一个分离的，以数据为中心的发布订阅模型。 Aso称为“数据总线”模式。 应用程序参与对等的DataBus，并且可以发布/订阅任何数据（由DDS-Topic名称标识），以及调用或实现任何服务操作（由DDS-Service名称标识）。 DDS是完全对等的，中间不需要任何代理。 有一种发现机制可以持续运行，以检测引用相同主题名称的兼容发布者和订阅者应用程序。 一旦检测到它们，便开始直接交换信息。 订户应用程序可以指定过滤器（基于内容或基于时间的）以指示他们想要接收的信息。也可以在发布方进行筛选，以减少在线上传递的信息。|DDS与SOME/IP之间的重要区别在于，使用DDS，应用程序不需要绑定到特定的服务实现。 它简单地引用了主题和服务，并且可以完全透明地一对一或一对多地进行通信，而无需更改应用程序代码。 虽然它需要跟踪单独对等方的存在或响应对等方的加入或离开来管理任何新对象。 这都是自动处理的。 从这个意义上讲，它比SOME/IP更灵活。|
|应用程序接口|SOME/IP没有定义标准API，具体的实现中通常提供了C++ API，但它们不能跨实现移植。 当然，通常来说，可以将SOME/IP看作AUTOSAR的一部分，这样的话，确实可以认为它定义了一些标准API。|DDS具有用于多种语言的标准API。 对于C ++和Java，它们包含在DDS-PSM-JAVA和DDS-PSM-CXX规范中。 标准C和ADA API是从IDL到C和ADA规范派生的。 除此之外，还有针对C＃和其他语言的特定于供应商的API。 因此，通常可以移植DDS应用程序并在DDS实现之间进行切换。| 译者案：这个说法不太客观。如果从IDL角度来谈的话，SOME/IP和DDS看起来并没有不同。 |
|网络传输|SOME / IP支持UDP和TCP进行数据传输。 AUTOSAR 4.3引入了对大于1400字节的UDP载荷进行分段的支持。 即便如此，为了进行可靠的通信，SOME/IP还是推荐使用TCP。|DDS使用称为RTPS（实时发布订阅）的有线协议，该协议在独立于平台的模型中定义，可以映射到不同的网络传输协议。 大多数DDS（DDS-RTPS）实现至少支持UDP，TCP和共享内存。 RTPS实现了与传输无关的可靠性和分段协议，该协议可在任何传输之上运行，包括带有多播的UDP。 因此，使用DDS可以通过多播UDP处理大数据和可靠数据。 SOME/IP无法做到这一点。许多DDS实现提供了“自定义传输” SDK，因此可以在不牺牲任何功能和QoS的情况下，通过自己的自定义传输运行DDS。 对于SOME/IP，这是不可能的，因为某些功能（如可靠性和分段性）必须由传输来实现。| 译者案：SOME/IP也可以通过TP-Message实现大数据广播。当然，可能DDS提供了更安全的策略？ |
|安全|一般来说，SOME/IP还依赖于传输来保证安全性。 因此，要安全使用它，就必须在TLS或DTLS上运行。|也可以在TLS或DTLS上作为传输运行DDS，但这不是首选的解决方案。 相反，对于DDS，最好使用DDS安全规范中定义的与传输无关的机制。 DDS安全性还提供了对安全性的更细粒度的控制以及一种用于进行访问控制的语言，因此可以分别保护DDS域和主题，并区分对主题的读写权限。 而且，由于DDS安全性与传输无关，因此可以与任何传输一起使用，包括共享内存，多播或自定义应用程序定义的传输。| |
|QoS支持|SOME/IP仅提供一种用于选择UDP与TCP的“可靠性” QoS设置。 其他任何事情都必须使用自定义应用程序逻辑来实现，而这取决于QoS策略，这可能非常困难。 而且，应用程序层代码不是那么可移植的，并且要求所有应用程序都包含相同的代码，或者至少链接公共的非标准库。|DDS提供了许多QoS策略，使用户可以声明性地指定发布者和订阅者之间如何交换信息。 DDS标准定义了20多个单独的策略。这些策略不仅控制可靠性，还控制其他方面，例如资源使用，数据优先级，数据可用性和故障转移。例如，QoS设置可以确定发布者或订阅者应用程序未能以特定速率发送或传递信息时提供通知的截止日期的功能；设置数据的持久性，以便可以将其重新发送给在生成和发送信息之后加入的订户应用程序；配置发布者和订阅者应用程序的历史深度；部署冗余系统，该系统根据所有权强度自动在众多资源中选择一种来源，配置自动实时消息，以确定远程应用程序是否仍然有效，并在应用程序无响应时执行自动故障转移。您可以从[DDS规范](https://www.omg.org/spec/DDS/1.4/PDF)的2.2.3节或其他实现的文档中获得更多详细信息（例如，请参见此[来自RTI Connext DDS的Qos速查表](https://community.rti.com/static/documentation/connext-dds/5.3.1/doc/manuals/connext_dds/RTI_ConnextDDS_CoreLibraries_QoS_Reference_Guide.pdf)。| |
|在其他需求中使用|SOME/IP主要被AUTOSAR应用于车载应用领域。|DDS具有更横向的用途。 它通常直接用作连接框架。 实际上，它已被工业互联网联盟（IIC）确定为IIoT的“核心连接框架”之一（请参阅[工业物联网连接框架](https://www.iiconsortium.org/IICF.htm) 文件）。 它也被用作其他标准和框架的一部分，例如[OpenFMB](https://openfmb.github.io/)、[ROS2](https://github.com/ros2/ros2/wiki)， [MD PnP](http://www.mdpnp.org/)，[FACE](https://www.opengroup.us/face/)，并且它也被包含在[AUTOSAR Adaptive（从版本18.03开始）](https://www.autosar.org/standards/adaptive-platform/adaptive-platform-1803/)。| 译者案：DDS至今（R20-11）还未被加入到AP中。 |
