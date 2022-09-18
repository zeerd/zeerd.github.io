---
layout: post
title: Yocto下为Linux系统添加任意账户
tag: [Yocto]
categories: [SystemIntegration]
---


在Yocto中，可以使用extrausers来添加任意账户。

<!--break-->
extrausers使用的是usermod这个命令，这个命令接收的静态密码必须是加密之后的，所以，首先需要转被一个加密之后的密码。

比如，我们要添加一个账号，叫做abc，他的密码是def。那么，需要执行如下命令：

```bash
user@ubuntu:/ $ mkpasswd --method=sha-512 'def'
$6$kRWvM8.WloS0Yg$5ZfXfD.ZaDMkwsQzzXldUtf2RpiODYsYGYPHlbfU.xsp4QndMBeaNzxooJQilFqp6I1y7JHjsUvfAj9BNKUEb/
```

命令会返回一个加密之后的SHA256的字符串。



然后，我们可以写一个bbclass来完成添加帐号的动作，比如叫做abc-extrausers.bbclass，这样一个独立的bbclass也便于日后的维护。内容如下：

```python
inherit extrausers
EXTRA_USERS_PARAMS = " useradd abc; \
                       usermod  -p '$6$kRWvM8.WloS0Yg$5ZfXfD.ZaDMkwsQzzXldUtf2RpiODYsYGYPHlbfU.xsp4QndMBeaNzxooJQilFqp6I1y7JHjsUvfAj9BNKUEb/' abc; \
"

```

可以看到，“-p”后面的参数填写的就是刚才执行mkpasswd命令获得的结果。

这个文件编写好之后，放入到classes目录中，比如/meta-abc/classes。



接下来，只要在yocto编译使用的主recipe内，比如core-image-minimal.bb，添加inherit abc-extrausers即可。


