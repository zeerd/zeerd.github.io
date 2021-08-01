---
layout: post
title: 在QNX中设备文件的编写
tag: [QNX,ResMgr]
---

本示例用于演示如何在QNX中编写设备文件。

<!--break-->

代码来自于QNX的 [官网](https://www.qnx.com/developers/docs/6.4.0/neutrino/prog/resmgr.html) 。
解释都添加在代码里了。

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include <errno.h>
#include <stddef.h>
#include <unistd.h>

#include <devctl.h>
#include <sys/iofunc.h>
#include <sys/dispatch.h>
#include <sys/resmgr.h>

#define DEVICE_NAME "/dev/sample"

static resmgr_connect_funcs_t    connect_funcs;
static resmgr_io_funcs_t         io_funcs;
static iofunc_attr_t             attr;

static void init_my_functions(void);

int main(int argc, char **argv)
{
    /* declare variables we'll be using */
    resmgr_attr_t        resmgr_attr;
    dispatch_t           *dpp;
    dispatch_context_t   *ctp;
    int                  id;

    /**
     * 创建一个Dispatch接口，用于接收从客户端发来的消息，也就是控制/访问命令。
     */
    if((dpp = dispatch_create()) == NULL) {
        fprintf(stderr,
                "%s: Unable to allocate dispatch handle.\n",
                argv[0]);
        return EXIT_FAILURE;
    }

    /* initialize resource manager attributes */
    memset(&resmgr_attr, 0, sizeof resmgr_attr);
    resmgr_attr.nparts_max = 1;
    resmgr_attr.msg_max_size = 2048;

    /*
     * 初始化功能句柄。这里存在两种功能接口，分别是：连接功能、访问功能。
     * 使用 iofunc_func_init() 可以将所有功能初始化成默认接口。
     */
    iofunc_func_init(_RESMGR_CONNECT_NFUNCS, &connect_funcs,
                     _RESMGR_IO_NFUNCS, &io_funcs);

    /*
     * 初始化设备属性。
     * 这个例子中，仅仅设定了设备的访问权限。这也是我们最常用到的属性。
     * 其他更细节的属性信息就不在此一一列出了，可以去QNX官网查看。
     */
    iofunc_attr_init(&attr, S_IFNAM | 0666, NULL, NULL);

    /**
     * 这个后面再聊。
     */
    init_my_functions();

    /**
     * 注册设备名称。只有注册成功之后，这个设备才能被其他进程看到。
     */
    id = resmgr_attach(
            dpp,            /* dispatch接口的句柄      */
            &resmgr_attr,   /* resource manager attrs */
            DEVICE_NAME,  /* device name            */
            _FTYPE_ANY,     /* open type              */
            0,              /* flags                  */
            &connect_funcs, /* connect routines       */
            &io_funcs,      /* I/O routines           */
            &attr);         /* handle                 */
    if(id == -1) {
        fprintf(stderr, "%s: Unable to attach name.\n", argv[0]);
        return EXIT_FAILURE;
    }

    /**
     * 分配内存空间并初始化Dispatch。在这之后，Dispatch才能够发挥作用。
     */
    ctp = dispatch_context_alloc(dpp);

    /**
     * Dispatch的主循环。
     * 在这之后，客户端就可以访问本设备了。如：
     *   fd = open ("/dev/sample", O_RDONLY);
     *   read (fd, buf, BUFSIZ);
     */
    while(1) {
        if((ctp = dispatch_block(ctp)) == NULL) {
            fprintf(stderr, "block error\n");
            return EXIT_FAILURE;
        }
        dispatch_handler(ctp);
    }

    return 0;
}

/**
 * buffer 模拟的是当前资源的内容。
 */
static char *buffer = "Hello world\n";
static int my_read (resmgr_context_t *ctp, io_read_t *msg, RESMGR_OCB_T *ocb);
static int my_devctl(resmgr_context_t *ctp, io_devctl_t *msg, RESMGR_OCB_T *ocb);
static void init_my_functions(void)
{
    /**
     * 既然要写一个设备文件，那就不可能全用默认的功能。这里会进行自动以功能的替换工作。
     */

    /**
     * read对应客户端的read()函数调用。
     */
    io_funcs.read = my_read;
    /**
     * 这里设定了资源的大小，以便后面进行读取操作时进行参考。
     */
    attr.nbytes = strlen (buffer)+1;

    /**
     * devctl对应客户端的devctl()函数调用。
     */
    io_funcs.devctl = my_devctl;
}

static int my_read (resmgr_context_t *ctp, io_read_t *msg, RESMGR_OCB_T *ocb)
{
    int         nleft;
    int         nbytes;
    int         nparts;
    int         status;

    /**
     * 判断客户端是否拥有本设备资源的读权限。
     */
    if ((status = iofunc_read_verify (ctp, msg, ocb, NULL)) != EOK)
        return (status);

    /**
     * 下面这个写法表示本设备资源不支持XTYPE。
     * XTYPE有很多，
     * 比如是否支持乱序读写（即通过offset跳转到指定位置读写，而不是顺序读写）。
     * 关于XTYPE的细节，这里不进行更多的展开。有兴趣的读者可以参考：
     * http://www.qnx.com/developers/docs/7.1/index.html
     *       #com.qnx.doc.neutrino.resmgr/topic/read_write_XTYPE.html
     */
    if ((msg->i.xtype & _IO_XTYPE_MASK) != _IO_XTYPE_NONE)
        return (ENOSYS);

    /*
     *  基于剩余资源和客户端缓冲区大小来计算本次可以读取多少个字节的信息。
     *
     *  OCB是 Open Control Block 的缩写。
     *  用于记录当前资源被使用的情况，比如读到第几个字节了。更多细节可以参考：
     *  http://www.qnx.com/developers/docs/7.1/index.html
     *        #com.qnx.doc.neutrino.sys_arch/topic/proc_OCBs.html
     *  其中的：
     *  ocb->offset记录的是客户端当前访问到本资源的偏移量。
     *  ocb->attr记录的是OCB自身的属性。比如nbytes就是资源的总字节数。
     */
    nleft = ocb->attr->nbytes - ocb->offset;
    nbytes = min (msg->i.nbytes, nleft);

    if (nbytes > 0) {
        /**
         * 使用IOV机制返回数据。
         *
         * IOV是“Input/Output Vector”的缩写。
         * 当应用程序需要访问不连续地址内的多段数据时，
         * IOV机制可以一次性的提供所有数据信息，而不需要多次传入/传出。
         *
         * resmgr_context_t内仅预留了一个IOV的位置。
         * 也就是说，它借用了IOV的接口，但是不支持多段数据。
         */
        SETIOV (ctp->iov, buffer + ocb->offset, nbytes);

        /**
         * 固定用法：设置返回的字节数。
         * 这个数值其实就是客户端read()的返回值。
         */
        _IO_SET_READ_NBYTES (ctp, nbytes);

        /*
         * 更新客户端访问到的资源的当前位置。
         */
        ocb->offset += nbytes;

        /**
         * 我们仅使用了一个SETIOV()。
         * 当然，无论如何，resmgr_context_t也仅支持一个IOV。
         */
        nparts = 1;
    } else {
        /**
         * 返回0， 表示客户端已经读取了所有资源。
         */
        _IO_SET_READ_NBYTES (ctp, 0);

        /**
         * 没有任何数据返回，因此是0个IOV。
         */
        nparts = 0;
    }

    /**
     * 设置访问时间无效化。基本上就是一个读动作的固定操作。
     * 具体的含义还有待深究。
     */
    if (msg->i.nbytes > 0)
        ocb->attr->flags |= IOFUNC_ATTR_ATIME;

    /**
     * 指明在本次访问过程中使用到了几个IOV。
     */
    return (_RESMGR_NPARTS (nparts));
}


/**
 * 正规来说，下面这些内容应该写到一个头文件中提供给客户端程序。
 * 这里为了让相关的代码尽可能出现在一起，便于阅读，就不进行拆分了。
 */
typedef union _my_devctl_msg {
        int tx;             //Filled by client on send
        int rx;             //Filled by server on reply
} data_t;
union {
    data_t  data;
    int     data32;
} *rx_data;
#define MY_CMD_CODE      1
#define MY_DEVCTL_GETVAL __DIOF(_DCMD_MISC,  MY_CMD_CODE + 0, int)
#define MY_DEVCTL_SETVAL __DIOT(_DCMD_MISC,  MY_CMD_CODE + 1, int)
#define MY_DEVCTL_SETGET __DIOTF(_DCMD_MISC, MY_CMD_CODE + 2, union _my_devctl_msg)

/**
 * global_integer 用来模拟我们可以控制的资源。
 */
int global_integer = 99;
static int my_devctl(resmgr_context_t *ctp, io_devctl_t *msg, RESMGR_OCB_T *ocb)
{

    int nbytes, status, previous;

    /**
     * 处理系统默认的 DCMD_ALL_* 的命令（dcmd）。
     *
     * 按我的理解，这件事情也可以不做。
     * 另外，如果要重写部分系统的默认命令的话，也可以把这个丢到最后。
     */
    if ((status = iofunc_devctl_default(ctp, msg, ocb)) != _RESMGR_DEFAULT) {
        return(status);
    }
    status = nbytes = 0;

    /**
     * 如果读者有过使用ioctl()或者devctl()接口的经验，
     * 就会知道，这两个接口的数据参数的类型是根据命令（dcmd）的不同而不同的。
     *
     * _DEVCTL_DATA(msg->i)用于返回客户端传入的数据的首地址。
     * 本程序根据实际的数据类型进行指针的转换。
     * 这个示例程序中，所有命令的数据类型全部相同，因此在此处进行了转换。
     * 实际的使用中，更多的情况是针对不同的命令转换成不同的数据类型。
     */
    rx_data = _DEVCTL_DATA(msg->i);

    /**
     * 下面是三个例子：
     * SET: 向设备设置一个数值
     * GET: 从设备读取一个数值
     * SETGET: 这只一个数值并返回之前的旧数值
     */
    switch (msg->i.dcmd) {
    case MY_DEVCTL_SETVAL:
        global_integer = rx_data->data32;
        nbytes = 0;
        break;

    case MY_DEVCTL_GETVAL:
        rx_data->data32 = global_integer;
        nbytes = sizeof(rx_data->data32);
        break;

    case MY_DEVCTL_SETGET:
        previous = global_integer;
        global_integer = rx_data->data.tx;
        rx_data->data.rx = previous;        //Overwrites tx data
        nbytes = sizeof(rx_data->data.rx);
        break;

    default:
        return(ENOSYS);
    }

    /**
     * 初始化返回值的结构体。
     */
    memset(&msg->o, 0, sizeof(msg->o));

    /**
     * 如果想要给devctl()提供返回值，则使用如下方式。
     */
    msg->o.ret_val = status;

    /* 对于Get类型的命令，在此设置返回结果的数据大小。 */
    msg->o.nbytes = nbytes;

    return(_RESMGR_PTR(ctp, &msg->o, sizeof(msg->o) + nbytes));
}
```

用如下的程序可以进行简单的测试：


```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

#include <devctl.h>

#define MY_CMD_CODE      1
#define MY_DEVCTL_GETVAL __DIOF(_DCMD_MISC,  MY_CMD_CODE + 0, int)

int main(int argc, char **argv)
{
    int fd = open("/dev/sample", O_RDWR);

    char buff[1024] = "";
    read(fd, buff, 1024);
    printf("%s\n", buff);

    int val;
    devctl(fd, MY_DEVCTL_GETVAL, &val, sizeof(val), NULL);
    printf("%d\n", val);

    return 0;
}

```