---
layout: post
title: OpenSSL和密钥、证书
tags: [OpenSSL]
categories: [Ethernet]
---

简单总结一下密钥、证书，以及如何通过OpenSSL生成密钥和证书。

<!--break-->

## 密钥

```plantuml!
rectangle "对称密钥" as key {
  rectangle symKey [
    对称密钥
    ....
    如：DES、3DES、AES
    ----
    速度快，但是安全性相对差
  ]

  rectangle os_enc_key #pink;line:red;line.bold;text:red [
    openssl aes-256-cbc
      -e -pbkdf2 -in input.txt -base64 -md sha256
      -K 123 -iv 456 -S 789
      > output.txt
    ....
    对称加密（-e）没有所谓的密钥文件，只有类似密钥的东西.
    也就是Salt(-S)、IV(-iv)、Key(-K)。
    注意：示例使用了123、456、789。真实的密钥要非常复杂。
    实际上这么简单的密钥几乎和没有加密是一样的。
  ]
  rectangle os_dec_key #pink;line:red;line.bold;text:red [
    openssl aes-256-cbc
      -d -pbkdf2 -in output.txt -base64 -md sha256
      -K 123 -iv 456 -S 789
      > input.txt
    ....
    使用同样的Salt(-S)、IV(-iv)、Key(-K)解密（-d）。
  ]
  rectangle os_enc_p2k #pink;line:red;line.bold;text:red [
    openssl aes-256-cbc
      -e -pbkdf2 -md sha256 -P
      -k 1234
    ....
    OpenSSL提供了一个方法，通过一个密码（-k）
    随机生成一组Salt、IV、Key。
  ]
  rectangle os_enc_ps #pink;line:red;line.bold;text:red [
    openssl aes-256-cbc
      -e -pbkdf2 -in input.txt -base64 -md sha256
      -k 1234
      > output.txt
    ....
    同样的，也可以直接使用密码加（-e）解（-d）密。
  ]
}

symKey --> os_enc_key
os_enc_key --> os_dec_key

symKey --> os_enc_p2k
os_enc_p2k --> os_enc_ps
```

```plantuml!
rectangle "非对称密钥" as key {
  rectangle "ASN.1" as ASN1

  rectangle CER
  rectangle DER
  rectangle PER
  rectangle XER

  rectangle PEM

  rectangle asymKey [
    非对称密钥
    ....
    如：RSA、DSA
    ----
    速度慢，但是安全性相对高
  ]

  rectangle pubKey #aliceblue;line:blue;line.dotted;text:blue [
    公钥
  ]

  rectangle privKey #aliceblue;line:blue;line.dotted;text:blue [
    私钥
  ]

  rectangle p1 #aliceblue;line:blue;line.dotted;text:blue [
    PKCS #1
    ....
    是专门为 RSA 密钥进行定义的
  ]
  rectangle p8 #aliceblue;line:blue;line.dotted;text:blue [
    PKCS #8
    ....
    为 RSA 和其它密钥所使用
  ]

  rectangle os_rsa #pink;line:red;line.bold;text:red [
    openssl genrsa
      -<cipher>
      -passout pass:1234
      -out server.key 2048
    ....
    生成私钥文件
    ----
    “<cipher>”的可选项参照“man openssl-genrsa”。
    它是用来加密密钥自身的。
  ]
  rectangle os_rsa_pub #pink;line:red;line.bold;text:red [
    openssl rsa
      -in server.key
      -pubout -out server.pub.key
    ....
    通过私钥文件生成公钥文件
  ]
  rectangle os_key #pink;line:red;line.bold;text:red [
    openssl genpkey
      -algorithm RSA
      -out privatekey.key
      -pass pass:1234
      -des-ede3-cbc
  ]
}

asymKey --> ASN1

ASN1 -- CER
ASN1 -- DER
ASN1 -- PER
ASN1 -- XER

DER --> PEM : Base64编码
PEM --> DER : Base64解码

PEM --> pubKey
pubKey --> p1
pubKey --> p8

PEM --> privKey
privKey --> p1
privKey --> p8

p1 --> os_rsa
os_rsa --> os_rsa_pub
p8 --> os_key
```

## 证书

```plantuml!
rectangle "证书" as cert {
  rectangle CERT #palegreen;line:green;line.dashed;text:green [
    证书编码
  ]
  rectangle x509 #palegreen;line:green;line.dashed;text:green [
    X.509
    ....
    仅用于公钥。常用扩展名：der，cer或者crt
    ----
    含有公钥、身份信息、签名信息和有效性信息等信息
    ----
    可以由CA颁发，也可以自签名产生
  ]
  rectangle p7b #palegreen;line:green;line.dashed;text:green [
    PKCS#7
    ....
    常用扩展名：p7b
    ----
    一个或者多个X.509证书或者PKCS#6证书，
    并且可以包含CRL信息
  ]
  rectangle p12 #palegreen;line:green;line.dashed;text:green [
    PKCS#12
    ....
    常用扩展名：p12或者pdx
    ----
    一个或者多个证书，
    并且还可以包含证书对应的私钥
  ]
  rectangle os_req #pink;line:red;line.bold;text:red [
    openssl req
      -new
      -passin pass:1234
      -key server.key
      -out server.csr
    ....
    生成一个证书请求（ CertificationRequest ）文件。
    使用“-x509”参数时直接生成自签名证书文件。
  ]
  rectangle os_x509 #pink;line:red;line.bold;text:red [
    openssl x509
      -req
      -passin pass:1234
      -in server.csr
      -CA ca.crt -CAkey ca.key -CAcreateserial
      -out server.crt -days 20000
    ....
    通常，可以通过 req 命令的 -x509 参数直接生成自签
    名的 X.509 证书。
    需要通过 CA 颁发证书时则需要使用 x509 命令。
  ]
}

CERT ---> x509
CERT --> p12
CERT --> p7b

x509 --> os_req
x509 --> os_x509
```

## 其他

```plantuml!
allowmixing

rectangle "其他" as others {
  rectangle os_dh #pink;line:red;line.bold;text:red [
    openssl dhparam
      -out dh2048.pem 2048
    ....
    生成一个DH文件。DH文件仅在服务端使用。
  ]
  rectangle os_show #pink;line:red;line.bold;text:red [
    openssl x509 -text -in input.crt
    ....
    查看证书内容。
  ]
}

json Abstracts {
  "ASN.1": "Abstract Syntax Notation One",
  "CER": ["Canonical Encoding Rules", "规范编码规则"],
  "DER": ["Distinguished Encoding Rules", "唯一编码规则"],
  "PER": ["Packed Encoding Rules", "压缩编码规则"],
  "XER": ["XML Encoding Rules", "XML编码规则"],
  "PKCS": "Private-Key Information Syntax Standard",
  "PEM": ["Privacy Enhanced Mail", "隐私增强邮件"],
  "AES": "Advanced Encryption Standard",
  "DES": "Data Encryption Standard",
  "3DES": "Triple Data Encryption Algorithm"
}
```

## 参照

[PEM 的 Label 值](https://www.rfc-editor.org/rfc/rfc7468#section-4)
