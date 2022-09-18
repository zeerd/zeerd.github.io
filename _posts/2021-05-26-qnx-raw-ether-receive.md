---
layout: post
title: 在QNX中直接基于数据链路层接收裸数据
tag: [Ethernet,Raw]
categories: [QNX]
---

本示例用于演示如何在QNX中直接基于数据链路层接收裸数据。

<!--break-->

```c
/**
 * $QCC receiver.c -lsocket
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
     * 与发送篇相同，我们继续使用BPF来进行裸数据的接收。
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
     * 选定接收数据时需要使用的设备。类似于eth0这类的接口名称。
     * 这里我们通过命令行参数argv[1]传入。
     */
    if (ioctl(fd, BIOCSETIF, &req) > 0){
        perror("Could not bind to BPF \n");
        return -1;
    }

    /**
     * 当接收缓冲区内出现数据时，立刻返回，而不是累计更多数据包之后一同处理。
     * 以便可以快速的处理数据。
     */
    int setimmediate = 1;
    if (ioctl(fd, BIOCIMMEDIATE, &setimmediate) == -1){
        perror("Could set IO immediate \n");
    }

    /**
     * 这个是重点，设定BPF过滤器，以便筛选我们真正需要的数据。
     * 这么做的好处是，筛选工作会在内核中完成，降低应用程序负荷。
     * 过滤器的配置和使用方法可以参考FreeBSD的资料。
     * 下面的示例会逐条给出解释。但是更多的用法需要参照如下链接所示：
     * https://www.freebsd.org/cgi/man.cgi?bpf(4)#FILTER_MACHINE
     */
    #define ETHERTYPE 0x1234
    struct bpf_program filter;
    static struct bpf_insn insns[] = {
       /**
        * BPF_LD的作用是将指定的数据读入到一个BPF_LD累加器中。
        * BPF_H表示读取的长度是16bit。
        * BPF_ABS表示从指定的绝对偏移位置开始读取。
        * 下面的命令意味着：
        * 从第12个Bytes开始读，读取16个bit。刚好是Ethernet报头的类型位。
        */
       BPF_STMT(BPF_LD+BPF_H+BPF_ABS, 12),
       /**
        * BPF_JMP的作用是根据比较的结果进行跳转。
        * BPF_K表示BPF_JEQ的“判断源”是参数1中给出的常量。
        * BPF_JEQ表示“判断源”是否与累加器中的数据相等。
        * 如果相等，则按着参数2给出的偏移跳转；否则按着参数3给出的偏移跳转。
        * 下面命令意味着：
        * 如果累加器中的数据等于ETHERTYPE，则执行下一句，否则跳过一句执行。
        */
       BPF_JUMP(BPF_JMP+BPF_JEQ+BPF_K, ETHERTYPE, 0, 1),
       /**
        * BPF_JMP表示筛选器终止并返回数据。
        * BPF_K表示返回数据的字节个数等于参数1给出的长度。“-1”表示所有。
        * 前面判断中，如果累加器内的数据等于ETHERTYPE，则执行这一句。
        */
       BPF_STMT(BPF_RET+BPF_K, (u_int)-1),
       /**
        * BPF_JMP表示筛选器终止并返回数据。
        * BPF_K表示返回数据的字节个数等于参数1给出的长度。“0”表示忽略此包数据。
        * 前面判断中，如果累加器内的数据不是ETHERTYPE，则执行这一句。什么数据都不返回。
        */
       BPF_STMT(BPF_RET+BPF_K, 0),
    };
    filter.bf_insns = insns;
    filter.bf_len = (sizeof(insns) / sizeof(insns[0]));
    if (ioctl(fd, BIOCSETF, &filter) < 0) {
        perror("Could not set BPF filter\n");
    }

    /**
     * 获取数据缓冲区的长度。为读取数据做准备。
     */
    int n = 0, m = 0, buffer_len = 0;
    if (ioctl(fd, BIOCGBLEN, &buffer_len) == -1){
        perror("Could get buffer length \n");
    }

    /**
     * 读取数据。
     */
    char buf[buffer_len];
    memset(buf, 0, buffer_len);
    if ((buffer_len = read(fd, buf, buffer_len)) != -1) {
        struct bpf_hdr *packet = (struct bpf_hdr *)buf;
        /**
         * 注意：从BPF读取到的数据带有26个Bytes的BPF数据报头。
         *       26即packet->bh_hdrlen的数值。
         *       如果仅需解析以太网数据包，可以跳过读取到的前26个字节。
         */
        char *frame = buf + packet->bh_hdrlen;
        buffer_len -= packet->bh_hdrlen;

        /**
         * 下面，为了便于查看数据进行了一些格式化输出。也可以不必关注。
         */
        printf("package size is %d, pbf length is %d.\n",
                buffer_len, packet->bh_hdrlen);
        for(int i=0; i<(buffer_len/16)+1; i++) {
            printf("\n0x%04x: ", i*16);
            if(n+16 < buffer_len) m = 16;
            else m = buffer_len - n;
            for(int j=0;j<16;j++,n++) {
                if(j < m) printf("%02X ", frame[i*16+j]);
                else printf("   ");
            }
            for(int j=0;j<m;j++) {
                char c = frame[i*16+j];
                if(32 <= c && c < 127)  printf("%c", c);
                else  printf(".");
            }
        }
    }
    printf("\n");

    return close(fd);
}
```

使用[前文](/qnx-raw-ether-send/)中的发送程序发送数据，使用本程序接收，结果大概是这个样子。

```planttext
package size is 1526, pbf length is 26.

0x0000: 00 01 02 03 04 05 06 07 08 09 0A 0B 12 34 0E 0F .............4..
0x0010: 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F ................
0x0020: 20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F  !"#$%&'()*+,-./
0x0030: 30 31 32 33 34 35 36 37 38 39 3A 3B 3C 3D 3E 3F 0123456789:;<=>?
0x0040: 40 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F @ABCDEFGHIJKLMNO
0x0050: 50 51 52 53 54 55 56 57 58 59 5A 5B 5C 5D 5E 5F PQRSTUVWXYZ[\]^_
0x0060: 60 61 62 63 64 65 66 67 68 69 6A 6B 6C 6D 6E 6F `abcdefghijklmno
0x0070: 70 71 72 73 74 75 76 77 78 79 7A 7B 7C 7D 7E 7F pqrstuvwxyz{|}

                                     ......
```

与tcpdump看到的数据有一点儿不同。这里的数据是从以太网数据报头开始输出的。
而tcpdump会跳过前面14个字节——即以太网报头——开始输出。
