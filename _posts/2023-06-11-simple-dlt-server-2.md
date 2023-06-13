---
layout: post
title: 一个简易的DLT服务(非Boost版本)
tag: [DLT,COVESA]
categories: [Program]
---

当目标系统不支持Dlt时，可以作为一个备选方案。

<!--break-->

本代码基于 COVESA 的 [DLT Viewer](https://github.com/COVESA/dlt-viewer) 和 AUTOSAR 的 [AUTOSAR的DLT标准协议](https://www.autosar.org/fileadmin/standards/R22-11/FO/AUTOSAR_PRS_LogAndTraceProtocol.pdf) 做成。

要读懂下面代码的话，可能需要先阅读一下AUTOSAR的DLT标准协议。
注释中标注的类似宏定义的大写字母单词都是来自于AUTOSAR协议的，可以直接使用它们进行搜索。

```cpp
/*
   gcc dlt.c -pthread -o simple-dlt-server
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <stdint.h>
#include <time.h>

#include <sys/types.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#include <unistd.h>
#include <sys/syscall.h>
#include <pthread.h>

#define PORT 3490

#define _WORD_BYTE0(x) ((uint8_t)((x) & 0xFF))
#define _WORD_BYTE1(x) ((uint8_t)((x) >> 8))

#define _LONG_BYTE0(x) ((uint8_t)((x) & 0xFF))
#define _LONG_BYTE1(x) ((uint8_t)(((x) >> 8) & 0xFF))
#define _LONG_BYTE2(x) ((uint8_t)(((x) >> 16) & 0xFF))
#define _LONG_BYTE3(x) ((uint8_t)(((x) >> 24) & 0xFF))

static const char * ecuid = "ECU1";
static const char * apid = "TST";
static const char * apds = "simple dlt server";
static const char * ctid = "SMP";
static const char * ctds = "simple dlt server context";
static const char * ver = "Simple DLT Server Version 0.0.2";

static char counter = 0;
static int session = 0;

inline static uint32_t dlt_timestamp(void);

// [PRS_Dlt_00309] The time resolution is in 0.1 milliseconds.
static uint32_t dlt_timestamp(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)ts.tv_sec  * 10000
         + (uint32_t)ts.tv_nsec / 100000; /* in 0.1 ms = 100 us */
}

/**
 * This information is not defined by the AUTOSAR.
 * It might be defined by GENIVI for DLT-Viewer Only.
 */
static void say_connected(void)
{
    uint8_t dlt[1024+1] = {0};

    uint32_t timestamp = dlt_timestamp();

    dlt[ 0] = 0x35;
    dlt[ 1] = 0;
    dlt[ 2] = _WORD_BYTE1(0x20); /* header + extend header */
    dlt[ 3] = _WORD_BYTE0(0x20); /* header + extend header */
    memcpy(&dlt[4], ecuid, 4);
    dlt[ 8] = _LONG_BYTE3(timestamp);
    dlt[ 9] = _LONG_BYTE2(timestamp);
    dlt[10] = _LONG_BYTE1(timestamp);
    dlt[11] = _LONG_BYTE0(timestamp);
    dlt[12] = 0x26; // DLT_CONTROL_RESPONSE
    dlt[13] = 0x01; // Number of Arguments = 1
    memcpy(&dlt[14], apid, 4);
    memcpy(&dlt[18], ctid, 4);
    dlt[22] = 0x02; // dlt-viewer defined command
    dlt[23] = 0x0f; // dlt-viewer defined command
    dlt[24] = 0x00; // dlt-viewer defined command
    dlt[25] = 0x00; // dlt-viewer defined command
    dlt[26] = 0x00;
    dlt[27] = 0x02;
    dlt[28] = 0x00;
    dlt[29] = 0x00;
    dlt[30] = 0x00;
    dlt[31] = 0x00;

    send(session, dlt, 32, MSG_NOSIGNAL);
}

/**
 * Tell The DLT-Viewer who we are, if it asked.
 */
static void get_ecu_software_version(void)
{
    uint8_t dlt[1024+1] = {0};

    uint32_t timestamp = dlt_timestamp();

    int o = 0;
    dlt[o++] = 0x35;
    dlt[o++] = 0;
    o+=2; // reserved for length;
    memcpy(&dlt[o], ecuid, 4); o += 4;
    dlt[o++] = _LONG_BYTE3(timestamp);
    dlt[o++] = _LONG_BYTE2(timestamp);
    dlt[o++] = _LONG_BYTE1(timestamp);
    dlt[o++] = _LONG_BYTE0(timestamp);
    dlt[o++] = 0x26; // DLT_CONTROL_RESPONSE
    dlt[o++] = 0x01; // Number of Arguments = 1
    memcpy(&dlt[o], apid, 4); o += 4;
    memcpy(&dlt[o], ctid, 4); o += 4;
    dlt[o++] = 0x13; // 5.3.10 Get ECU Software Version
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;
    dlt[o++] = 0; // 0 == OK
    dlt[o++] = (uint8_t)strlen(ver); // Length of the string swVersion
    dlt[o++] = 0; // Length of the string swVersion
    dlt[o++] = 0; // Length of the string swVersion
    dlt[o++] = 0; // Length of the string swVersion
    memcpy(&dlt[o], ver, strlen(ver)); o += (uint8_t)strlen(ver);

    dlt[ 2] = _WORD_BYTE1(o);
    dlt[ 3] = _WORD_BYTE0(o);

    send(session, dlt, o, MSG_NOSIGNAL);
}

/**
 * Send all the registered application and contents to DLT-Viewer.
 * We got only one application and one content here, so it's simple.
 * Need more loops for more application and more contents.
 */
static void get_log_info(void)
{
    uint8_t dlt[1024+1] = {0};

    uint32_t timestamp = dlt_timestamp();

    int o = 0;

    // 5.1.1.1 Standard Header
    dlt[o++] = 0x35; // HTYP : Header Type
    dlt[o++] = 0;    // MCNT : Message Counter
    o+=2; // LEN : reserved for length, will be set at the end
    memcpy(&dlt[o], ecuid, 4); o += 4; // ECU : ECU ID (optional)
    dlt[o++] = _LONG_BYTE3(timestamp);
    dlt[o++] = _LONG_BYTE2(timestamp);
    dlt[o++] = _LONG_BYTE1(timestamp);
    dlt[o++] = _LONG_BYTE0(timestamp); // TMSP : Timestamp (optional)

    // 5.1.1.2 Extended Header
    dlt[o++] = 0x26; // MSIN: DLT_CONTROL_RESPONSE MSTP=0x3, MTIN=0x2
    dlt[o++] = 0x00; // NOAR: Number of Arguments = 1
    memcpy(&dlt[o], apid, 4); o += 4; // APID
    memcpy(&dlt[o], ctid, 4); o += 4; // CTID

    // 5.3.3 Get Log Info
    dlt[o++] = 0x03; // Service ID
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;

    // Response Parameter
    // status : uint8
    dlt[o++] = 7; // all apid & cnid
    // applicationIds : LogInfoType
    dlt[o++] = 1; // only one app
    dlt[o++] = 0; // split
    memcpy(&dlt[o], apid, 4); o += 4;
    dlt[o++] = 1; // Number of Context IDs
    dlt[o++] = 0; // split
    memcpy(&dlt[o], ctid, 4); o += 4;
    dlt[o++] = 0xff; // level of log by default
    dlt[o++] = 0xff; // status of trace by default
    dlt[o++] = (uint8_t)strlen(ctds); // length
    dlt[o++] = 0; // length
    memcpy(&dlt[o], ctds, strlen(ctds)); o += (uint8_t)strlen(ctds);
    dlt[o++] = (uint8_t)strlen(apds); // length
    dlt[o++] = 0; // length
    memcpy(&dlt[o], apds, strlen(apds)); o += (uint8_t)strlen(apds);
    // reserved : 4*uint8
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;
    dlt[o++] = 0x00;

    dlt[ 2] = _WORD_BYTE1(o);
    dlt[ 3] = _WORD_BYTE0(o);
    send(session, dlt, o, MSG_NOSIGNAL);
}

static void* dlt_reciever(void *_arg)
{
    /**
     * DLT-Server is a TCP server. DLT-Viewer is a TCP Client.
     */
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    struct sockaddr_in sock;
    memset((char *) &sock, 0, sizeof(sock));

    sock.sin_family = AF_INET;
    sock.sin_port = htons(PORT);
    sock.sin_addr.s_addr = htonl(INADDR_ANY);
    bind(fd, (struct sockaddr*)&sock, sizeof(struct sockaddr_in));

    listen(fd, 1);

    struct sockaddr_storage addr;
    socklen_t len = sizeof(struct sockaddr_storage);
    session = accept(fd, (struct sockaddr*)&addr, &len);

    say_connected();

    /**
     * The DLT Viewer want to get some information of our DLT server.
     * The do-while() used to receive the requests from DLT viewer and
     * give callbacks.
     */
    int result = 0;
    do {
        char data[1024];
        result = recv(session, data, 1024, 0);
        if(result > 0) {
            uint8_t dlt[1024] = {0};
            size_t offset = 0;
            size_t length = data[2] << 8 | data[3];
            while(offset + length <= result) {
                length = data[offset+2] << 8 | data[offset+3];
                uint8_t type = data[offset+12];
                uint8_t command = data[offset+22];

                if(type == 0x16) { // DLT_CONTROL_REQUEST
                    if(command == 0x13) { // Get ECU Software Version
                        get_ecu_software_version();
                    }
                    else if(command == 0x03) { // Get Log Info
                        get_log_info();
                    }
                    else {
                        memcpy(dlt, &data[offset], 0x1a);
                        dlt[ 2] = 0;
                        dlt[ 3] = _WORD_BYTE0(27);
                        dlt[ 7] = 0x31; // modify the ECU ID
                        dlt[12] = 0x26;
                        dlt[26] = 1; // NOT_SUPPORTED
                        send(session, dlt, 27, MSG_NOSIGNAL);
                    }
                }
                offset += length;
            }
        }
    } while (result > 0);

    close(session);
    close(fd);
}

/**
 * Core function to send a log.
 */
void send_dlt_message(int _level, const char *_msg)
{
    uint8_t dlt[1024+1] = {0};

    uint16_t length = (uint16_t)strlen(_msg);
    uint32_t session_id = syscall(SYS_gettid);
    uint32_t timestamp = dlt_timestamp();

    int o=0;
    dlt[o++] = 0x3d; // 001(Version Number = 1)
                     // 111(With Timestamp)(With Session ID)(With ECUID)
                     // 0(Non-Most Significant Byte First)
                     // 1(extended header is used)
    dlt[o++] = ++counter;
    o+=2; // reserved for length;
    memcpy(&dlt[o], ecuid, 4); o += 4;
    dlt[o++] = _LONG_BYTE3(session_id);
    dlt[o++] = _LONG_BYTE2(session_id);
    dlt[o++] = _LONG_BYTE1(session_id);
    dlt[o++] = _LONG_BYTE0(session_id);
    dlt[o++] = _LONG_BYTE3(timestamp);
    dlt[o++] = _LONG_BYTE2(timestamp);
    dlt[o++] = _LONG_BYTE1(timestamp);
    dlt[o++] = _LONG_BYTE0(timestamp);
    dlt[o++] = 0x11 + (_level << 4); // (DLT_LOG_xxx by random)
                                     // (Dlt Log Message) (Verbose)
    dlt[o++] = 0x01; // Number of Arguments = 1
    memcpy(&dlt[o], apid, 4); o += 4;
    memcpy(&dlt[o], ctid, 4); o += 4;
    dlt[o++] = 0x00;
    dlt[o++] = 0x02;
    dlt[o++] = 0x00;
    dlt[o++] = 0x00; // Bit9=1 : Type String = ASCII
                     // (String Coding=0, Type Length = not defined)
    if(length > 1024 - o - 3) {
        length = (uint16_t)(1024 - o - 3);
    }
    dlt[o++] = _WORD_BYTE0(length);
    dlt[o++] = _WORD_BYTE1(length);
    memcpy(&dlt[o], _msg, length); o += length;
    dlt[o++] = '\0';

    dlt[2] = _WORD_BYTE1(o); /* header + extend header */
    dlt[3] = _WORD_BYTE0(o); /* header + extend header */

    send(session, dlt, o, MSG_NOSIGNAL);
}

int main(int argc, char *argv[])
{
    pthread_t tid;
    pthread_create(&tid, NULL, dlt_reciever, NULL);

    for(int i=0;i<10;i++) {
        sleep(1); /* wait thread to create socket */
        /**
         * Send a DLT-Log with random log level.
         */
        send_dlt_message((random() % 6), "Hello, DLT!");
    }
    return 0;
}
```

参照: [使用 Boost 的版本](../simple-dlt-server)
