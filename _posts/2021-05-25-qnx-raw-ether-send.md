---
layout: post
title: 在QNX中直接基于数据链路层发送裸数据
tag: [Ethernet,Raw]
categories: [QNX]
---

本示例用于演示如何在QNX中直接基于数据链路层发送裸数据。

<!--break-->

```c
/**
 * $QCC sender.c -lsocket
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <arpa/inet.h>
#include <fcntl.h>
#include <net/bpf.h>
#include <net/ethertypes.h>
#include <net/if_ether.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    /**
     * 在QNX上，如果需要绕过TCP/IP协议直接发送自定义的以太网裸数据，则需要使用BPF功能。
     * 即：Berkeley Packet Filter
     * 以下是在QNX系统中打开BPF设备的通用做法。因为BPF设备是可以多次重复打开的。
     */
    char bpfname[16] = {"/dev/bpf\0"};
    int fd = open(bpfname, O_RDWR);
    if (fd < 0){
        for (int i=0; i < 128; i++){
            snprintf(bpfname, sizeof(bpfname), "/dev/bpf%d", i);
            fd = open(bpfname, O_RDWR);

         if(fd != -1)
            break;
        }
        if(fd < 0){
            perror("could not open any /dev/bpf device.");
            return -1;
        }
    }

    struct ifreq req;
    snprintf(req.ifr_name, sizeof(req.ifr_name), "%s", argv[1]);
    /**
     * 选定发送数据时需要使用的设备。类似于eth0这类的接口名称。
     * 这里我们通过命令行参数argv[1]传入。
     */
    if (ioctl(fd, BIOCSETIF, &req) > 0){
        perror("Could not bind to BPF \n");
        return -1;
    }

    int hdr_complete = 1;
    /**
     * 禁用自动添加的以太网报头。
     * 也就是说，目标MAC地址，自身MAC地址，以太网类型都由我们自己来写入。
     */
    if (ioctl(fd, BIOCSHDRCMPLT , &hdr_complete) == -1){
        perror("Could get disable HDRCMPLT \n");
        return -1;
    }

    int pdu_size = 1500; // MTU
    char pdu[pdu_size];
    /**
     * 前12个Bytes分别是目标MAC地址和源MAC地址。这里为了省事就不特意设定了。
     */
    for(int i=0; i<pdu_size; i++) {
        pdu[i] = i % 255;
    }
    /**
     * 写入以太网类型。
     */
    #define ETH_TYPE 0x1234
    pdu[12] = (char)(ETH_TYPE >> 8);
    pdu[13] = (char)(ETH_TYPE & 0x00FF);

    /**
     * 发送做好的数据包。
     */
    if (write(fd, pdu, pdu_size) < 0) {
        perror("Failed to send data");
    }

    close(fd);

    return 0;
}
```

使用tcpdump去抓包，结果大概是这个样子。

```planttext
00:41:17.196077 06:07:08:09:0a:0b (oui Unknown) > 00:01:02:03:04:05 (oui Unknown
), ethertype Unknown (0x1234), length 1500:
        0x0000:  0e0f 1011 1213 1415 1617 1819 1a1b 1c1d  ................
        0x0010:  1e1f 2021 2223 2425 2627 2829 2a2b 2c2d  ...!"#$%&'()*+,-
        0x0020:  2e2f 3031 3233 3435 3637 3839 3a3b 3c3d  ./0123456789:;<=
        0x0030:  3e3f 4041 4243 4445 4647 4849 4a4b 4c4d  >?@ABCDEFGHIJKLM
        0x0040:  4e4f 5051 5253 5455 5657 5859 5a5b 5c5d  NOPQRSTUVWXYZ[\]
        0x0050:  5e5f 6061 6263 6465 6667 6869 6a6b 6c6d  ^_`abcdefghijklm
        0x0060:  6e6f 7071 7273 7475 7677 7879 7a7b 7c7d  nopqrstuvwxyz{|}

                                     ......
```

除了ethertype被我们人为替换成了0x1234（覆盖了原本的0x0c0d）,
其他部分就是for循环中灌入的连续数字。

如果需要获取本地的MAC地址，可以参考这篇文章： https://forums.openqnx.com/t/topic/8097/2
