---
layout: post
title: 使用标准Linux的接口实现监控网卡状态
tag: [Netlink]
categories: [Linux,Ethernet]
---

通过AF_NETLINK监控网卡的UP/DOWN状态。

<!--break-->


```c
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

#include <unistd.h>
#include <errno.h>

#include <net/if.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <linux/netlink.h>
#include <linux/rtnetlink.h>

/**
 * Test:
 * sudo ifconfig eth0 up
 * sudo ifconfig eth0 down
 */

int get_ifindex_by_ifname(const char *_name)
{
    int err = 0;
    int ifindex = -1;
    int fd = socket(PF_PACKET, SOCK_DGRAM, 0);
    if( fd == -1 ) {
        fprintf(stderr, "failed to open socket: %s\n", strerror(errno));
        return -1;
    }

    struct ifreq device;
    memset(&device, 0, sizeof(device));
    strncpy(device.ifr_name, _name, IFNAMSIZ);

    err = ioctl(fd, SIOCGIFINDEX, &device);
    if( err == -1 ) {
        fprintf(stderr, "failed for SIOCGIFINDEX: %s\n", strerror(errno));
        goto exit_error;
    }

    ifindex = device.ifr_ifindex;

exit_error:
    close(fd);
    return ifindex;
}

void monitor_netlink(int _index, const char *_name)
{
    int link_up_sts = -1;

    int fd  = socket(AF_NETLINK, SOCK_RAW, NETLINK_ROUTE);
    if (fd < 0) {
        fprintf(stderr, "failed to open AF_NETLINK: %s\n", strerror(errno));
        return;
    }

    struct sockaddr_nl addr;
    memset((void *)&addr, 0, sizeof(addr));

    addr.nl_family = AF_NETLINK;
    addr.nl_pid = getpid();
    addr.nl_groups = RTMGRP_LINK;

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        fprintf(stderr, "failed to bind RTMGRP_LINK: %s\n", strerror(errno));
        goto exit_error;
    }

    fd_set fds;

    while(1) {
        FD_ZERO(&fds);
        FD_CLR(fd, &fds);
        FD_SET(fd, &fds);

        struct timeval timeout = {0, 500 * 1000}; // 500 ms
        int retval = select(FD_SETSIZE, &fds, NULL, NULL, &timeout);
        if (retval == -1) {

        }
        else if (retval) {
            char buf[4096];
            struct iovec iov = {buf, sizeof buf};
            struct sockaddr_nl snl;
            struct msghdr msg = {
                (void *) &snl, sizeof snl, &iov, 1, NULL, 0, 0};

            struct nlmsghdr *msgHdr;
            struct ifinfomsg *ifi;
            memset(buf, 0, sizeof(buf));

            int status = recvmsg(fd, &msg, 0);
            if(status > 0) {
                for (msgHdr = (struct nlmsghdr *)buf;
                        NLMSG_OK(msgHdr, (unsigned int)status);
                        msgHdr = NLMSG_NEXT(msgHdr, status)) {
                    if (msgHdr->nlmsg_type == NLMSG_DONE) {
                        break;
                    }
                    else if (msgHdr->nlmsg_type == NLMSG_ERROR) {
                        fprintf(stderr, "NLMSG_ERROR: %s\n", strerror(errno));
                        break;
                    }
                    else if (msgHdr->nlmsg_type == RTM_NEWLINK) {
                        ifi = (struct ifinfomsg *)NLMSG_DATA(msgHdr);
                        if (ifi->ifi_index == _index) {
                            bool link_up = ifi->ifi_flags & IFF_RUNNING;
                            if (link_up != link_up_sts) {
                                link_up_sts = link_up;
                                if (link_up) {
                                    printf("%s : UP\n", _name);
                                }
                                else {
                                    printf("%s : DOWN\n", _name);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

exit_error:
    close(fd);
    return;
}

int main(int argc, char *argv[])
{
    int ifindex = get_ifindex_by_ifname(argv[1]);
    printf("%d : %s\n", ifindex, argv[1]);

    monitor_netlink(ifindex, argv[1]);

    return 0;
}
```