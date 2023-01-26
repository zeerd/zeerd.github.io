---
layout: post
title: TLS技术简介
tags: [TLS,OpenSSL]
categories: [Program]
---

<!--break-->

## 交互时序（规范）

### TLS v1.2

详情可以参照官方文档 [RFC 5246](https://www.rfc-editor.org/rfc/rfc5246) 。

在 RFC 5246 的第 [36](https://www.rfc-editor.org/rfc/rfc5246#page-36) 页中，
给出了 TLS v1.2 的握手流程图。如下图所示：

```plantuml!
Client -> Server : ClientHello
note left
  客户端发送所支持的 SSL/TLS 最高协议版本号
  和所支持的加密算法集合
  及压缩方法集合等信息
  给服务器端。
end note
Server -> Client : ServerHello
note right
  选定双方都能够支持的 SSL/TLS 协议版本
  和加密方法及压缩方法，
  返回给客户端
end note
Server -\ Client : Certificate
note right
  服务器端发送服务端证书给客户端
end note
opt 仅需要时
  Server -\ Client : ServerKeyExchange
  note right
    仅当服务器证书消息（如果已发送）不包含足够
    的数据以允许客户端交换预主密钥时，服务器才
    会发送 ServerKeyExchange 消息。
    通常，只有使用 DHE_DSS 、 DHE_RSA 、
    DH_anon 时会发生。
  end note
end
opt 双向验证
  Server -\ Client : CertificateRequest
  note right
    服务器端向客户端请求客户端证书。
  end note
end
Server -> Client : ServerHelloDone
note right
  服务器端通知客户端初始协商结束
end note
opt 双向验证
  Client -\ Server : Certificate
  note left
    客户端向服务器端发送客户端证书。
  end note
end
Client -> Server : ClientKeyExchange
note left
  客户端使用服务器端的公钥，对客户端公钥和密钥
  种子进行加密，再发送给服务器端。
end note
opt 双向验证
  Client -\ Server : CertificateVerify
  note left
    客户端用本地私钥生成数字签名，
    并发送给服务器端，让其通过收到的客户端公钥
    进行身份验证。
  end note
end
Client -> Client : ChangeCipherSpec
note left
  客户端通知服务器端已将通讯方式切换到加密模式
end note
Client -> Server : Finished
note left
  客户端做好加密通讯的准备。
end note
Server -> Server : ChangeCipherSpec
note right
  服务器端通知客户端已将
  通讯方式切换到加密模式。
end note
Server -> Client : Finished
note right
   服务器做好加密通讯的准备。
end note
Client <-> Server : Application Data
```

* 半箭头表示可选发送的消息或者根据实际境况决定是否发送的消息


### TLS v1.3

详情可以参照官方文档 [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) 。

在 RFC 8446 的第 [11](https://www.rfc-editor.org/rfc/rfc8446#page-11) 页中，
给出了 TLS v1.2 的握手流程图。如下图所示：

```plantuml!
Client -> Server : ClientHello
note left
  包含的信息：
    密钥交换：
      //key_share// :
        终端的加密参数
      //signature_algorithms// ：
        希望服务器通过证书验证自己的客户端必须
        发送“signature_algorithms”
      //psk_key_exchange_modes// ：
        使用预共享密钥时，必须发送
      //pre_shared_key// ：
        用于协商预共享密钥的身份，以用于与 PSK
        密钥建立相关的给定握手。
end note
Server -> Client : ServerHello
note right
  包含的信息：
    密钥交换：
      //key_share// :
        终端的加密参数
      //pre_shared_key// ：
        用于协商预共享密钥的身份，以用于与 PSK
        密钥建立相关的给定握手。
    服务端参数：
      EncryptedExtensions ：
        用来发送加密扩展信息。
      //CertificateRequest// ：
        当客户端需要验证时发送
    验证：
      //Certificate// ：
        用于身份验证的证书
      //CertificateVerify// ：
        对信息的签名
end note
Client -> Server : 验证
note left
  包含的信息：
    //Certificate// ：
      用于身份验证的证书
    //CertificateVerify// ：
      对信息的签名
end note
Client <-> Server : Application Data
```

* 斜体字表示根据情况可能使用也可能不使用的内容。
  事实上，除了“ EncryptedExtensions ”，全都是斜体字。
* 可以注意到， v1.3 中没有提压缩算法，应该是删除了。

## 开发（基于OpenSSL）

### 初始化

通过 SSL_CTX_set_cipher_list() （v1.2）或者 SSL_CTX_set_ciphersuites()
（v1.3）确定并设置加密算法。

通过 SSL_CTX_set_min_proto_version() 和 SSL_CTX_set_max_proto_version()
确定支持的版本范围。

服务端和客户端都通过 SSL_CTX_use_certificate_file() 加载各自的证书文件。
如果涉及到证书链，则改为通过 SSL_CTX_use_certificate_chain_file() 加载。
事实上，可以无脑使用后者。

服务端和客户端都通过 SSL_CTX_use_PrivateKey_file() 加载各自的私钥文件。

如果涉及到根证书，则通过 SSL_CTX_load_verify_locations() 加载。

如果证书有密码，使用 SSL_CTX_set_default_passwd_cb_userdata() 进行提供。

如果需要 Diffie-Hellman ，
OpenSSL 3.0之前，可以在服务端通过 SSL_CTX_set_tmp_dh() 加载 DH 文件。
OpenSSL 3.0以后，使用 SSL_CTX_set0_tmp_dh_pkey() 加载
[EVP_PKEY-DH](https://www.openssl.org/docs/man3.0/man7/EVP_PKEY-DH.html) 。

### 双向验证

可以通过对
[SSL_CTX_set_verify()](https://www.openssl.org/docs/manmaster/man3/SSL_CTX_set_verify.html)
 的使用来决定是否开启双向验证。

| 端 | 参数 | 解释 |
| -- | ---- | --- |
| 客户端 | SSL_VERIFY_NONE | 客户端不验证服务器证书， 但是服务器必须提供证书 |
| ^ | SSL_VERIFY_PEER | 客户端验证服务器证书 |
| 服务器 | SSL_VERIFY_NONE | 服务器不验证客户端证书， 客户端可以不提供证书 |
| ^ | SSL_VERIFY_PEER | 服务器验证客户端证书（如果有） |
| ^ | SSL_VERIFY_PEER \| SSL_VERIFY_FAIL_IF_NO_PEER_CERT | 客户端必须提供证书 |

这里的情况会比较复杂，需要设计合理的接口来配置，或者干脆分模型编译。

### 客户端

在通用的 Socket 连接动作之后，需要再进行一次基于 TLS 的连接。
这个功能使用 SSL_connect() 接口来完成。

```plantuml!
activate Client
Client --> Server : connect
note left : POSIX connect
Client -> Client : SSL_new
Client -> Client : SSL_set_fd
Client -> Server : SSL_connect
note left : SSL connect
deactivate Client
```

### 服务端

在通用的 Socket Accept 动作之后，需要再进行一次基于 TLS 的 Accept。
这个功能使用 SSL_accept() 接口来完成。

```plantuml!
activate Client
Client --> Server : connect
note left : POSIX connect
activate Server
Server --> Server : accept()
deactivate Server
note right : POSIX accept
Client --> Client : SSL_new
Client --> Client : SSL_set_fd
Client --> Server : SSL_connect
note left : SSL connect
activate Server
Server -> Server : SSL_new
Server -> Server : SSL_set_fd
Server -> Server : SSL_accept
note right : SSL accept
deactivate Server
deactivate Client
```

### 释放资源

整个过程中会创建两类资源，分别是“ SSL_CTX* ”和“ SSL* ”。
前者需要使用 SSL_CTX_free() 来释放；
后者需要使用 SSL_shutdown() 和 SSL_free() 来释放。

客户端比较简单，只有一条线。
服务端需要注意对 SSL_accept() 产生的各个 Session 进行释放。

### 证书的做成

我用下面的方法做出了可用的证书。例子中使用了“ abcd ”作为密码。

```bash
openssl genrsa -aes256 -passout pass:abcd -out server.key 2048

openssl req -new -passin pass:abcd -key server.key -out server.csr \
  -subj "/C=CN/ST=LN/L=DL/O=MyCompany/OU=MyUnit/CN=SVR"

openssl genrsa -aes256 -passout pass:abcd -out client.key 2048

openssl req -new -passin pass:abcd -key client.key -out client.csr  \
  -subj "/C=CN/ST=LN/L=DL/O=MyCompany/OU=MyUnit/CN=CLI"

openssl genrsa -aes256 -passout pass:abcd -out ca.key 2048

openssl req -new -passin pass:abcd -x509 -key ca.key -out ca.crt  \
  -subj "/C=CN/ST=LN/L=DL/O=MyCompany/OU=MyUnit/CN=CA"

openssl x509 -req -passin pass:abcd -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 20000

openssl x509 -req -passin pass:abcd -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt -days 20000

openssl dhparam -out dh2048.pem 2048
```

其中：

* ca.crt ： 对应CA证书。即 SSL_CTX_load_verify_locations() 。
* client.key/server.key ： 对应私钥。即 SSL_CTX_use_PrivateKey_file() 。
* client.crt/server.crt ： 对应证书。即 SSL_CTX_use_certificate_chain_file() 。


### 验证

原则上来说，通讯成功我们就认为验证通过了。
不过还是有一些特殊的内容需要额外验证其是否生效了。

#### 缺陷检查

有一个叫做 [testssl.sh](https://github.com/drwetter/testssl.sh) 的工具。
可以对TLS功能进行一些检查。

#### Diffie-Hellman

TLS v1.2的情况比较好验证，只要通过wireshark来检查是否存在如下字段：

```
Transport Layer Security
  TLSv1.2 Record Layer: Handshake Protocol: Server Key Exchange
    Handshake Protocol: Server Key Exchange
      EC Diffie-Hellman Server Params
```

另外，注意cipher的选择。比如确定要使用 DH 功能，就要选择带有 DHE 字样的cipher。
比如“ECDHE-RSA-AES256-GCM-SHA384”。

TLS v1.3的比较麻烦。从
[协议标准](https://www.rfc-editor.org/rfc/rfc8446#section-7.4)
来看，是支持DH的。但是，目前没有找到好的办法验证DH功能到底生效了没有。

### 扩展

对照 IANA 的 [扩展列表](https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml) 和 [RFC8446](https://www.rfc-editor.org/rfc/rfc8446#section-4.2) 。可以看到，后者中并没有覆盖所有的扩展。
可能正是基于这个原因，OpenSSL也没有实现所有的扩展。

如果确实需要，则可以通过“[SSL_CTX_add_custom_ext](https://www.openssl.org/docs/manmaster/man3/SSL_CTX_add_custom_ext.html)”接口来添加。具体的使用方法可以参照OpenSSL提供的测试程序“[sslapitest.c](https://github.com/openssl/openssl/blob/openssl-3.0/test/sslapitest.c#L5668)”

## 参照

* [证书认证方式 SSL_CTX_set_verify](https://www.jianshu.com/p/7d82d5f7c848)
* [Simple TLS Server](https://wiki.openssl.org/index.php/Simple_TLS_Server)
* [SSL/TLS Client](https://wiki.openssl.org/index.php/SSL/TLS_Client)
