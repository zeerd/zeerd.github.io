---
layout: post
title: CommonAPI基本流程
tag: [COVESA,CAPI,CommonAPI,IPC]
categories: [Ethernet]
---



以GENIVI官方的[E01HelloWorld](https://github.com/GENIVI/capicxx-core-tools/tree/master/CommonAPI-Examples/E01HelloWorld)为例。为了界面整洁性，后面使用X替换掉E01HelloWorld。

图中的Y表示Binding，可能是DBus，也可能是SomeIP，也可能是GENIVI新推出的Wamp，或者其他以后会推出的新东西。
<!--break-->

[TOC]

# Session : Init

## Common Sequence

### Server

```mermaid
sequenceDiagram
    Server ->> +Runtime : get
    Runtime ->> -Runtime : init
    Server ->> XStubImpl : XStubImpl
    Server ->> Runtime : registerService
    activate Runtime
    Runtime ->> Runtime : registerStub
    activate Runtime
    Runtime ->> Runtime : library init
    Runtime ->> +Runtime : registerStubHelper
    Runtime ->> -Factory : registerStub
    deactivate Runtime
    deactivate Runtime
    Factory ->> Factory : getConnection
    Factory ->> YStubAdapter : init
    Factory ->> Factory : registerStubAdapter
```

###Client

```mermaid
sequenceDiagram
    Client ->> +Runtime : get
    Runtime ->> -Runtime : init
    Client ->> +XProxy : buildProxy
    activate Runtime
    XProxy ->> -Runtime : createProxy
    activate Runtime
    Runtime ->> Runtime : library init
    Runtime ->> +Runtime : createProxyHelper
    Runtime ->> -Factory: createProxy
    deactivate Runtime
    deactivate Runtime
    Factory ->> Factory : getConnection
    Factory ->> YProxy : init
```

## Details

### Library Init

```mermaid
sequenceDiagram
    Runtime ->> Runtime : getLibrary
    Note right of Runtime: get the name <br/> of the library
    Runtime ->> Runtime : loadLibrary
    Runtime ->> +Factory : FactoryInit
    Note left of Factory : run FactoryInit <br/> as constructor
    Factory ->> -Runtime : registerFactory

    Runtime ->> +XYProxy : registerYProxy
    Note left of XYProxy : run registerXYProxy <br/> as constructor
    XYProxy ->> +Factory : registerProxyCreateMethod
    Factory ->> -Factory : method saved
    deactivate XYProxy
    
    Runtime ->> +XYStubAdapter : registerXYStubAdapter
    Note left of XYStubAdapter : run registerXYStubAdapter <br/> as constructor
    XYStubAdapter ->> +Factory : registerStubAdapterCreateMethod
    Factory ->> -Factory : method saved
    deactivate XYStubAdapter
```

### Get Connection

#### SOME/IP

```mermaid
sequenceDiagram
    participant Factory as DBus::Factory
    participant Connection as SomeIP::Connection
    participant Y as vsomeip
    Factory ->> Factory : getConnection
    activate Connection
    Factory ->> Connection : make_shared
    Connection ->> Y : create_application
    Factory ->> Connection : connect
    Connection ->> Y : init
    Connection ->> Y : register_state_handler
    deactivate Connection
```

#### DBus

```mermaid
sequenceDiagram
    participant Factory as DBus::Factory
    participant Connection as DBus::Connection
    participant Y as dbus
    Factory ->> Factory : getConnection
    activate Connection
    Factory ->> Connection : connect
    Connection ->> Y : dbus_bus_get_private
    deactivate Connection
```



# Session : sayHello

## Common Sequence

### Client to Binding

客户端调用接口函数sayHello()发送请求：

```mermaid
sequenceDiagram
Client(XClient) ->> XProxy : sayHello
XProxy ->> XYProxy : sayHello
XYProxy ->> YProxyHelper : callMethodWithReply
YProxyHelper ->> YConnection : sendYMessageWithReplyAndBlock
YConnection ->> Y : Send with Reply and Block
```



### Binding to Server

调用请求被通过Y转给了服务端：

```mermaid
sequenceDiagram
Y ->> YConnection : onReceive
YConnection ->> YStubAdapterHelper : onInterfaceYMessage
YStubAdapterHelper ->> XYStubAdapter : sayHelloStubDispatcher
XYStubAdapter ->> server(XStubImpl) : sayHello
server(XStubImpl) ->> server(XStubImpl) : _reply
```

### Server back to Binding

服务端处理完请求之后，将结果送回给客户端：

```mermaid
sequenceDiagram
participant Y
participant YConnection
participant YStubAdapterHelper
server(XStubImpl) ->> YStubAdapterHelper : sendReply
YStubAdapterHelper ->> YConnection : sendYMessage
YConnection ->> Y : Reply for Sent
```



### Binding return to Client

最终，请求结果被通过dbus转回给客户端，通过函数参数返回，过程与第一个Sequence相逆，这里不再描画。


## Details


### Send with Reply and Block

#### DBus

```mermaid
sequenceDiagram
YConnection ->> dbus : dbus_connection_send_with_reply_and_block
```

#### SOME/IP

```mermaid
sequenceDiagram
    participant YConnection
    participant vsomeip as vsomeip::application
    note over YConnection,vsomeip : client thread
    YConnection ->> vsomeip : send
    YConnection ->> YConnection : wait condition
    note over YConnection,vsomeip : capi thread
    vsomeip ->> YConnection : send
    YConnection ->> +YConnection : handleProxyReceive
    YConnection ->> -YConnection : notify condition
    note right of YConnection : client thread <br/> will continue <br/> to run
```



### On Receive

#### DBus

```mermaid
sequenceDiagram
dbus ->> DBusConnection : onLibdbusObjectPathMessage
DBusConnection ->> DBusStubAdapterHelper : onInterfaceDBusMessage
```

#### SOME/IP

```mermaid
sequenceDiagram
vsomeip ->> Connection : receive
alt requests
Connection ->> +Connection : handleStubReceive
Connection ->> -StubManager : handleMessage
StubManager ->> StubAdapterHelper : onInterfaceMessage
else
Connection ->> +Connection : handleProxyReceive
end
```


### Reply for Sent

#### DBus

```mermaid
sequenceDiagram
participant dbus
participant DBusConnection
DBusConnection ->> dbus : dbus_connection_send
```

#### SOME/IP

```mermaid
sequenceDiagram
participant vsomeip as vsomeip::application
participant DBusConnection
DBusConnection ->> vsomeip : send
```

## Serialize

CommonAPI提供了一组类，InputStream和OutputStream，来实现数据的编串和解串。不同的Binding需要根据实际需求来封装这些类。

比如在SOME/IP中，对于各种不同数据类型的封装是有严格的说明的。所以在someip部分的代码的hpp和cpp文件中，就可以看到大量的代码用于实现这部分内容。

