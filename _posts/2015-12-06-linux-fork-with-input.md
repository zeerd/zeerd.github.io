---
layout: post
title: Linux下通过socketpair调用其他程序并传入参数
tag: [Process]
categories: [Linux]
---
<!--break-->

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <errno.h>
#include <unistd.h>

#include <sys/socket.h>

#define ALOGV printf
#define ALOGD printf
#define ALOGE printf

typedef void(*_callback_t)(const char *);

void do_execv(char *const argv[], const char *input, _callback_t cb)
{
    int pid = -1;
    int sockets[2];

    socketpair( AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC, 0, sockets );

    pid = fork();
    if( pid > 0 ){

        int index = 0;
        char buf[1];
        char buffer[1024];

        close(sockets[1]);    // this descriptor is no longer needed

        if(input != NULL) {
            ALOGD("input=[%s]\n\n", input);
            write(sockets[0], input, strlen(input));
        }

        while (read(sockets[0], buf, 1) != 0)
        {
            buffer[index] = buf[0];
            if(buffer[index] == '\n') {
                buffer[index] = '\0';
                cb(buffer);
                index = 0;
                memset(buffer, 0, sizeof(buffer));
            }
            else {
                index++;
            }
        }

        cb(NULL);

        close(sockets[0]);
    }
    else if( pid == 0 ){

        close(sockets[0]);

        dup2(sockets[1], fileno(stdin)); // redirect stdin to the socketpair
        dup2(sockets[1], fileno(stdout));// redirect stdout to the socketpair
        dup2(sockets[1], fileno(stderr));// redirect stderr to the socketpair

        close(sockets[1]);    // this descriptor is no longer needed

        int i=0;
        while(argv[i] != NULL) {
            ALOGV("argv[%d] = %s\n", i, argv[i]);
            i++;
        }

        execv(argv[0], argv);

        ALOGE("execv : %s for %s", strerror(errno), argv[0]);

    }
    else{
        ALOGE( "fork failed\n");
        close( sockets[0] );
        close( sockets[1] );
    }
}

void callback(const char * result)
{
    ALOGD("callback(%s)\n", result);
}

int main(int argc, char *argv[])
{

    /* COMMENT :
       on my test system, the dup2(fd, 1) would fail,
       if no one has used the stdout. */

    ALOGD("\n");

    char * const telnet[] = {
        [0] = "/usr/bin/telnet",
        [1] = NULL
    };

    do_execv(telnet, "?\nq\n", callback);

    ALOGD("\n");

	while(1);

    return 0;
}
```
