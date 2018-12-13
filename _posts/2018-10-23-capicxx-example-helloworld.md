---
layout: post
title: CommonAPI基本流程
tag: [GENIVI,CAPI,CommonAPI,IPC]
---

以GENIVI官方的[E01HelloWorld](https://github.com/GENIVI/capicxx-core-tools/tree/master/CommonAPI-Examples/E01HelloWorld)为例。

<!--break-->
（为了界面整洁性，后面使用X替换掉E01HelloWorld）


# Session : Server Init

```mermaid
sequenceDiagram

    Server ->> +Runtime : get
    Runtime ->> -Runtime : init
    Server ->> XStubImpl : XStubImpl
    activate Runtime
    Server ->> Runtime : registerService
    Runtime ->> Runtime : registerStub
    Runtime ->> Runtime : getLibrary
    Note right of Runtime: get the name of the library
    Runtime ->> Runtime : loadLibrary
    Runtime ->> +DBusFactory : FactoryInit
    Note left of DBusFactory : run FactoryInit as constructor
    Runtime ->> XDBusStubAdapter : registerXDBusStubAdapter
    Note left of XDBusStubAdapter : run registerXDBusStubAdapter as constructor
    Runtime ->> Runtime : registerStubHelper
    Runtime ->> +DBusFactory : registerStub
    DBusFactory ->> XDBusStubAdapter : init
    DBusFactory ->> -DBusFactory : registerStubAdapter
    deactivate Runtime
```

# Session : Client Init

```mermaid
sequenceDiagram

    Client ->> +Runtime : get
    Runtime ->> -Runtime : init
    Client ->> +ProxyManager : buildProxy
    ProxyManager ->> -Runtime : createProxy
    activate Runtime
    Runtime ->> Runtime : getLibrary
    Note right of Runtime: get the name of the library
    Runtime ->> Runtime : loadLibrary
    Runtime ->> +DBusFactory : FactoryInit
    Note left of DBusFactory : run FactoryInit as constructor
    activate XDBusProxy
    Runtime ->> XDBusProxy : registerXDBusProxy
    Note left of XDBusProxy : run registerXDBusProxy as constructor
    XDBusProxy ->> DBusFactory : registerProxyCreateMethod
    deactivate XDBusProxy
    DBusFactory ->> -Runtime : registerFactory
    Runtime ->> Runtime : createProxyHelper
    activate DBusFactory
    Runtime ->> DBusFactory: createProxy
    DBusFactory ->> XDBusProxy : init
    deactivate DBusFactory
    deactivate Runtime
```

# Session : sayHello


客户端调用接口函数sayHello()发送请求：
```mermaid
sequenceDiagram
Client(XClient) ->> XProxy : sayHello
XProxy ->> XDBusProxy : sayHello
XDBusProxy ->> DBusProxyHelper : callMethodWithReply
DBusProxyHelper ->> DBusConnection : sendDBusMessageWithReplyAndBlock
DBusConnection ->> dbus : dbus_connection_send_with_reply_and_block
```

调用请求被通过dbus转给了服务端：
```mermaid
sequenceDiagram
dbus ->> DBusConnection : onLibdbusObjectPathMessage
DBusConnection ->> DBusStubAdapterHelper : onInterfaceDBusMessage
DBusStubAdapterHelper ->> XDBusStubAdapter : sayHelloStubDispatcher
XDBusStubAdapter ->> server(XStubImpl) : sayHello
server(XStubImpl) ->> server(XStubImpl) : _reply
```

服务端处理完请求之后，将结果送回给客户端：

```mermaid
sequenceDiagram
participant dbus
participant DBusConnection
participant DBusStubAdapterHelper
server(XStubImpl) ->> DBusStubAdapterHelper : sendReply
DBusStubAdapterHelper ->> DBusConnection : sendDBusMessage
DBusConnection ->> dbus : dbus_connection_send
```

最终，请求结果被通过dbus转回给客户端，通过函数参数返回，过程与第一个Sequence相逆，这里不再描画。
