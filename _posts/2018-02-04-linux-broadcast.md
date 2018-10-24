---
layout: post
title: “非惊群”的服务端技术框架
tag: [Linux,IPC,Broadcast]
---

目前Linux最常用的可支持群发的总线系统是DBUS，但是DBUS存在一个“惊群效应”。即不管对方客户端是否关注这条信息，都会发送给所有客户端。这样，就会导致在服务端群发消息是引发一次CPU峰值。影响系统运行效率。

<!--break-->
下面是一个简单的“非惊群”的服务端技术框架：

```c
void server_receive_msg(...)
{
    switch(id) {
        case MSG_REGISTER: {
            int find = 0;
            list_t *l = hashmap_get((void*)broadcast);
            if(l != NULL) {
                find = 1;
            }
            l = list_append(l, client);
            if(!find) {
                hashmap_put((void*)strdup(broadcast), l);
            }
        }
        break;

        case MSG_POST: {
            list_t *l = hashmap_get((void*)broadcast);
            if(l != NULL) {
	            list_t *it = l;
	            do {
	                post_message(it->data, broadcast);
	            } while((it = list_next(it)) != NULL);
	        }
        }
        break;
    }
}
```

客户端连接成功之后，通过MSG_REGISTER回报自己感兴趣的广播内容。服务端使用一个hashmap记录所有的广播名称。hashmap的value指向一个list。这个list中记录所有关注对应广播的客户端的列表。

当有客户端通过MSG_POST发送广播时，服务端查找hashmap找到广播对应的客户端列表。然后仅将广播转发给关注的客户端。避免非关注者被惊扰。

```c
void client_discnnt(...)
{
    hashmap_for_each(...) {
        list_t *l = list_remove(broadcast, client);
        hashmap_update(broadcast, l);
    }
}
```

当客户端断开连接时，服务端将这个客户端从列表中摘除。
