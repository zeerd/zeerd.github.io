---
layout: post
title: 给Wireshark添加基于Lua的SOME/IP解析插件
tag: [SOME/IP,WireShark]
categories: [Ethernet]
---

下面是一个简单的示例，仅支持最简单的SOME/IP数据解析。

并没有完全实现解析，也没有全面考虑SD中存在多Entry和多Option时的偏移计算问题。

<!--break-->

# 示例

```lua
-- SOME/IP Protocol

-- declare our protocol
someip_proto = Proto("someip","SOME/IP Protocol")

serviceId        = ProtoField.uint16(
                                      "someip.service",
                                      "Service Id",
                                      base.HEX)
methodId         = ProtoField.uint16(
                                      "someip.method",
                                      "Method Id",
                                      base.HEX)
length           = ProtoField.uint32(
                                      "someip.length",
                                      "Length",
                                      base.DEC)
clientId         = ProtoField.uint16(
                                      "someip.client",
                                      "Client Id",
                                      base.HEX)
sessionId        = ProtoField.uint16(
                                      "someip.session",
                                      "Session Id",
                                      base.HEX)
protocolVersion  = ProtoField.uint8(
                                      "someip.protocol",
                                      "Protocol Version",
                                      base.DEC)
interfaceVersion = ProtoField.uint8(
                                      "someip.interface",
                                      "Interface Version",
                                      base.DEC)
messageType      = ProtoField.uint8(
                                      "someip.messagetype",
                                      "Message Type",
                                      base.HEX)
returnCode       = ProtoField.uint8(
                                      "someip.returncode",
                                      "Return Code",
                                      base.HEX)
entriesLength    = ProtoField.uint32(
                                      "someip.entrieslength",
                                      "Length of Entries Array",
                                      base.DEC)
optionsLength    = ProtoField.uint32(
                                      "someip.optionslength",
                                      "Length of Options Array",
                                      base.DEC)
portNumber       = ProtoField.uint32(
                                      "someip.portnumber",
                                      "Port Number",
                                      base.DEC)

ipv4             = ProtoField.new(
                                      "IPv4-Address",
                                      "someip.ipv4",
                                      ftypes.IPv4)

someip_proto.fields = {
    serviceId,
    methodId,
    length,
    clientId,
    sessionId,
    protocolVersion,
    interfaceVersion,
    messageType,
    returnCode,
    entriesLength,
    optionsLength,
    portNumber,
    ipv4
}

-- create a function to dissect it
function someip_proto.dissector(buffer,pinfo,tree)
    pinfo.cols.protocol = "SOME/IP"
    local subtree = tree:add(someip_proto,buffer(),"SOME/IP Protocol Data")
    subtree:add(serviceId, buffer(0,2))
    subtree:add(methodId, buffer(2,2))
    subtree:add(length, buffer(4,4))
    subtree:add(clientId, buffer(8,2))
    subtree:add(sessionId, buffer(10,2))
    subtree:add(protocolVersion, buffer(12,1))
    subtree:add(interfaceVersion, buffer(13,1))
    subtree:add(messageType, buffer(14,1))
    subtree:add(returnCode, buffer(15,1))

    if buffer(0,2):uint() == 0xffff and buffer(2,2):uint() == 0x8100 then
        subtree = subtree:add(buffer(16), "SD Payload: " .. buffer(16))
        subtree:add(buffer(16,1), "Flags: " .. buffer(16,1))
        subtree:add(entriesLength, buffer(20,4))
        if buffer(24,1):uint() == 0x01 then
            local offset1e = 24;
            subtree1e = subtree:add(buffer(offset1e,16), "1st Entry: ")
            subtree1e:add(buffer(offset1e,1),
                          "Type: Offer Service: "
                          .. buffer((offset1e),1))
            subtree1e:add(buffer((offset1e + 1),1),
                          "Index 1st options: "
                          .. buffer((offset1e + 1),1))
            subtree1e:add(buffer((offset1e + 2),1),
                          "Index 2nd options: "
                          .. buffer((offset1e + 2),1))
            subtree1e:add(buffer((offset1e + 3),1),
                          "# of opt 1 & 2: "
                          .. buffer((offset1e + 3),1))
            subtree1e:add(buffer((offset1e + 4),2),
                          "Service ID: "
                          .. buffer((offset1e + 4),2))
            subtree1e:add(buffer((offset1e + 6),2),
                          "Instance ID: "
                          .. buffer((offset1e + 6),2))
            subtree1e:add(buffer((offset1e + 8),1),
                          "Major Version: "
                          .. buffer((offset1e + 8),1))
            subtree1e:add(buffer((offset1e + 9),3),
                          "TTL: "
                          .. buffer((offset1e + 9),3))
            subtree1e:add(buffer((offset1e + 12),4),
                          "Minor Version: "
                          .. buffer((offset1e + 12),4))
        end
        if buffer(20,4):uint() > 16 then
            subtree2e = subtree:add(buffer(40,16),
                                    "2nd Entry: "
                                    .. buffer(40,16))
        end
        if buffer(4,4):uint() > (12 + 4 + buffer(20,4):uint()) then
            local offset1o = 24 + buffer(20,4):uint();
            subtree:add(optionsLength, buffer(offset1o,4))
            subtree1o = subtree:add(buffer((offset1o + 4),12), "1st Option: ")

            subtree1o:add(buffer((offset1o + 4),2),
                          "Length: "
                          .. buffer((offset1o + 4),2))
            subtree1o:add(buffer((offset1o + 6),1),
                          "Type: "
                          .. buffer((offset1o + 6),1))
            subtree1o:add(ipv4,
                          buffer((offset1o + 8),4))
            subtree1o:add(buffer((offset1o + 13),1),
                          "L4-Proto: "
                          .. buffer((offset1o + 13),1))
            subtree1o:add(portNumber, buffer((offset1o + 14),2))
            if buffer(offset1o,4):uint() > 12 then
                subtree2o = subtree:add(buffer(offset1o+16,12),
                                        "2nd Option: "
                                        .. buffer(offset1o+16,12))
            end
        end
    else
        subtree:add(buffer(16), "Payload: " .. buffer(16))
    end
end

-- load the udp.port table
udp_table = DissectorTable.get("udp.port")
tcp_table = DissectorTable.get("tcp.port")
-- register our protocol to handle udp port 7777
udp_table:add(30490,someip_proto)
udp_table:add(31000,someip_proto)
tcp_table:add(31000,someip_proto)
```



# 安装

理论上来说，Plugin要安装到Wireshark的路径下。但是，每个不同的系统可能安装路径都不同，所以最简单的办法是全局搜索一下wireshark的路径。

```bash
user@ubuntu:~$ find /usr/ | grep -i wireshark | grep -i plugins
/usr/lib/x86_64-linux-gnu/wireshark/plugins
/usr/lib/x86_64-linux-gnu/wireshark/plugins/2.6
/usr/lib/x86_64-linux-gnu/wireshark/plugins/2.6/codecs
/usr/lib/x86_64-linux-gnu/wireshark/plugins/2.6/codecs/l16mono.so
...
user@ubuntu:~$ sudo vim /usr/lib/x86_64-linux-gnu/wireshark/plugins/2.6/someip.lua
```



# 参照
[Lua/Dissectors](https://wiki.wireshark.org/Lua/Dissectors)
[Creating a Wireshark dissector in Lua - part 1 (the basics)](https://mika-s.github.io/wireshark/lua/dissector/2017/11/04/creating-a-wireshark-dissector-in-lua-1.html)
[ProtoField](https://wiki.wireshark.org/LuaAPI/Proto#ProtoField)
[ProtoField.uint32](https://www.wireshark.org/docs/wsdg_html_chunked/lua_module_Proto.html#lua_fn_ProtoField_uint32_abbr___name____base____valuestring____mask____desc__)
