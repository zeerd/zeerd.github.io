---
layout: post
title: C++ Timer With Single thread
tags: [Timer]
---

一个简单的类似Boost的Timer代码。

<!--break-->

```cpp
#ifndef __TIMERCPP_H__
#define __TIMERCPP_H__

#include <string.h>
#include <unistd.h>

#include <sys/epoll.h>
#include <sys/timerfd.h>

#include <iostream>
#include <thread>
#include <chrono>
#include <atomic>
#include <functional>

class Timer {

private:
    std::atomic<bool> active_{true};

    std::shared_ptr<std::thread> t_;
    uint64_t delay_;
    int fd_;

    std::function<void(void)> func_;

private:
    void hdlr()
    {
        #define MAX_EVENTS 1
        struct epoll_event ev, events[MAX_EVENTS];

        int epollfd = epoll_create1(0);
        if (epollfd == -1) {
            fprintf(stderr, "epoll_create1 : %s\n", strerror(errno));
            return;
        }

        ev.events = EPOLLIN;
        ev.data.fd = fd_;
        if (epoll_ctl(epollfd, EPOLL_CTL_ADD, fd_, &ev) == -1) {
            fprintf(stderr, "epoll_ctl : %s\n", strerror(errno));
            return;
        }

        while(active_.load()) {
            int nfds = epoll_wait(epollfd, events, MAX_EVENTS, -1);
            if (nfds == -1) {
                fprintf(stderr, "epoll_wait : %s\n", strerror(errno));
                break;
            }
            if(!active_.load()) { break; }

            for (int n = 0; n < nfds; ++n) {
                if (events[n].data.fd == fd_) {
                    /* To stop the timer by set the new value to zero. */
                    struct itimerspec ts = { 0 };
                    int r = timerfd_settime(fd_, TFD_TIMER_ABSTIME, &ts, NULL);
                    if (r < 0) {
                        fprintf(stderr, "Failed to stop timer : %s",
                                                            strerror(errno));
                        break;
                    }

                    if(func_ != NULL) {
                        if(!active_.load()) { break; }
                        func_();
                        if(!active_.load()) { break; }
                    }
                }
            }
        }
    }

public:

    Timer()
    {
        active_ = true;
        fd_ = timerfd_create(CLOCK_MONOTONIC, 0);
        t_ = std::make_shared<std::thread>(std::bind(&Timer::hdlr, this));
    }
    ~Timer()
    {
        active_ = false;

        /* triger the epoll_wait() to return */
        delay_ = 0;
        async_wait(NULL);

        if(t_->joinable())
            t_->join();

        close(fd_);
        fd_ = -1;
    }

    void expires_from_now(std::chrono::minutes _t)
    {
        delay_ = std::chrono::minutes(_t).count() * 60 * 1000;
    }

    void expires_from_now(std::chrono::seconds _t)
    {
        delay_ = std::chrono::seconds(_t).count() * 1000;
    }

    void expires_from_now(std::chrono::milliseconds _t)
    {
        delay_ = std::chrono::milliseconds(_t).count();
    }

    void async_wait(std::function<void(void)> _func)
    {
        func_ = _func;

        struct timespec now;
        clock_gettime(CLOCK_MONOTONIC, &now);

        struct itimerspec timer_spec = { 0 };
        timer_spec.it_value.tv_sec = now.tv_sec;
        timer_spec.it_value.tv_nsec = now.tv_nsec;

        #define MAX_NSEC 1000000000
        uint64_t ns = delay_ * 1000000;
        timer_spec.it_value.tv_sec += (ns / MAX_NSEC);
        timer_spec.it_value.tv_nsec += ns % MAX_NSEC;

        if(timer_spec.it_value.tv_nsec >= MAX_NSEC) {
            timer_spec.it_value.tv_nsec -= MAX_NSEC;
            timer_spec.it_value.tv_sec++;
        }

        int res = timerfd_settime(fd_, TFD_TIMER_ABSTIME, &timer_spec, NULL);
        if (res < 0) {
            fprintf(stderr, "Failed to set timer : %s", strerror(errno));
            return;
        }
    }

    void stop()
    {
        active_ = false;
    }


    void cancel() {
        stop();
    }
};

#endif

```

一个简单的例子。

```cpp
/** g++ timercpp.cpp -std=c++11 -pthread */

#include "timercpp.hpp"

static std::shared_ptr<Timer> t;
static int c = 5;

static void onTimer()
{
	struct timespec now;
	clock_gettime(CLOCK_REALTIME, &now);
    printf("[%ld:%09ld]On Timer.\n", now.tv_sec, now.tv_nsec);

    c--;

    if(c > 0) {
        printf("Count down %d.\n", c);
        t->expires_from_now(std::chrono::milliseconds(200));
        t->async_wait(onTimer);
    }
}

int main(int argc, char *argv[])
{
    t = std::make_shared<Timer>();

    printf("Count down %d.\n", c);
    t->expires_from_now(std::chrono::milliseconds(200));
    t->async_wait(onTimer);

    printf("waiting for Timers.\n");
    sleep(2);
    printf("waited Timers.\n");
    t->stop();

    t = NULL;

    return 0;
}

```
