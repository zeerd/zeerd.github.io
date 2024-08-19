---
layout: post
title: Linux 系统自监控异常退出重启机制
tag: [Process]
categories: [Linux]
---

<!--break-->

在[前文](../linux-process-manager)的基础上进行调整，实现一个自监控异常退出重启机制。


```c
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

static pid_t pid_ = -1;
static int argc_;
static char **argv_;
static bool run_ = true;
static void sig_chld(int signo);
static void sig_term(int signo);
static int start_main(int argc, char *argv[]);

void real_main(int argc, char *argv[])
{
    // 主进程的实际任务
    srand(getpid());
    while (1) {
        printf("[%d]主进程正在运行...\n", getpid());
        sleep(1);
        // 模拟崩溃
        if (rand() % 5 == 0) {
            printf("[%d]主进程崩溃了！\n", getpid());
            char *a = NULL;
            *a      = 1;
        }
        // 模拟退出
        if (rand() % 5 == 0) {
            printf("[%d]主进程主动退出了！\n", getpid());
            if (rand() % 2 == 0) {
                exit(0);
            }
            else {
                exit(1);
            }
        }
    }
}

static void sig_term(int signo)
{
    printf("监控者被终止，信号：%d\n", signo);
    if (pid_ > 0) {
        printf("终止主进程，信号：%d\n", signo);
        kill(pid_, SIGTERM);
    }
    run_ = false;
}

static void sig_chld(int signo)
{
    int status;
    do {
        waitpid(pid_, &status, 0);
        if (WIFEXITED(status)) {
            int ret = WEXITSTATUS(status);
            if (ret == 0) {
                printf("主进程正常退出\n");
            }
            else {
                printf("主进程出错退出，状态码：%d\n", ret);
            }
            run_ = false;
            break;
        }
        else if (WIFSIGNALED(status)) {
            if (WTERMSIG(status) == SIGTERM || WTERMSIG(status) == SIGKILL) {
                printf("主进程被终止，信号：%d\n", WTERMSIG(status));
                run_ = false;
                break;
            }
            else {
                printf("主进程被异常信号终止，信号：%d\n", WTERMSIG(status));
            }
        }
        printf("重新启动主进程...\n");
        start_main(argc_, argv_);
    } while (0);
    return;
}

static int start_main(int argc, char *argv[])
{
    pid_ = fork();
    if (pid_ == -1) {
        perror("fork");
        exit(1);
    }
    else if (pid_ == 0) {
        real_main(argc, argv);
    }
    else {
        signal(SIGTERM, &sig_term);
        signal(SIGCHLD, &sig_chld);
        printf("监控者进程号：%d\n", getpid());
        printf("主进程进程号：%d\n", pid_);
    }
}

int main(int argc, char *argv[])
{
    int ret = 0;
    argc_   = argc;
    argv_   = argv;

    start_main(argc, argv);
    while (run_) {
        sleep(1);
    }

    return ret;
}
```
