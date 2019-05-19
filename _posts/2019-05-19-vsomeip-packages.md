---
layout: post
title: SOME/IP Packages
tag: [SOME/IP]
---


下面是一条基于UDP发送的Request。从192.168.1.1:49827发送到192.168.1.2:31000。

<!--break-->
```plant
0000   11 22 33 44 55 66 aa bb cc dd ee ff 08 00 45 00   ."3DUf........E.
0010   00 3e 64 ce 40 00 40 11 92 9f c0 a8 01 01 c0 a8   .>dÎ@.@.........
0020   01 02 c2 a3 79 18 00 2a 7f 79 11 11 33 33 00 00   ..Â£y..*.y..33..
0030   00 1a 00 01 00 01 01 00 00 00 53 4f 4d 45 49 50   ..........SOMEIP
0040   53 52 56 5f 53 45 54 55 50 5f 30 32               SRV_SETUP_02
```



### MAC

从0000地址开始，是MAC的报文。参照[协议](https://en.wikipedia.org/wiki/Ethernet_frame#Ethernet_II)。

前6个Bytes是源机MAC地址，接下来6个Bytes是目标机MAC地址。接下来的2个Bytes是[EtherType](https://en.wikipedia.org/wiki/EtherType#Examples)，其中的0x0800就是IPv4。

### IPv4

从000E地址开始，是IP的报文。参照[协议](https://en.wikipedia.org/wiki/IPv4#Header)。有兴趣可以自行查对，这里不做展开。

只说明一下，最后8个Bytes分别表示源IP和目的IP。

### UDP

从0022地址开始，是UDP的报文。参照[协议](https://en.wikipedia.org/wiki/User_Datagram_Protocol#Packet_structure)所示：

c2a3：Source port。即49827

7918：Destination port。即31000

002a：Length。表示这一包数据的长度是0x2a，即42Bytes。这个长度是包括SOME/IP报文的。

7f79：Checksum。

### SOME/IP

从002A地址开始，是SOME/IP的报文。参照[TR_SOMEIP_00031](http://www.some-ip.com/papers/cache/AUTOSAR_TR_SomeIpExample_4.2.1.pdf)所示：

1111：Service ID

3333：Method ID

0000001a：Length。表示这一包数据的长度是0x1a，即26Bytes。

0001：Client ID

0001：Session ID

01：Protocol Version

00：Interface Version

00：Message Type

00：Return Code

534f....3032：Payload。即发送的Request的内容，是一个字符串，SOMEIPSRV_SETUP_02。




