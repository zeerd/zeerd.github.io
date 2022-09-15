---
layout: post
title: 从glib到boost
tag: [glib,Boost]
---

# Start

使用boost替换glib，那么，需要关注的几个核心功能不外呼如下：

<!--break-->

* Mainloop
* Idle
* Timer

这些功能基本上可以通过Boost的如下几个头文件来实现。

```cpp
#include <boost/asio.hpp>
#include <boost/asio/io_service.hpp>
#include <boost/asio/steady_timer.hpp>
```

## Mainloop

Boost的Mainloop可以通过io_service来实现。对比来看的话：

GLib：
```cpp
GMainLoop *main_loop = g_main_loop_new (NULL, FALSE);
g_main_loop_run (main_loop);
g_main_loop_unref (main_loop);
```

Boost:
```cpp
boost::asio::io_service io_;
boost::asio::io_service::work work_(io_);
io_.run();
```
其中需要注意的一点是，Boost的IO在没有工作剩余的情况下会自动退出，所以通常的做法都是为IO添加一个什么都不做的work。

注意：如果确实有需要在同一个进程内重启IO的话，需要进行一个restart()处理。类似如下：

```cpp
io_.stop();

...

if(io_.stopped()) {
    io_.restart();
    io_.run();
}
else {
    io_.run();
}

```


## Idle

目前为止，我没有找到合适的实现Idle的方法。所以暂时来看，可以通过实现一个短Timer替代Idle。

## Timer

Boost的Timer有一点比较恶心的地方，是他的Timer Handle被触发的条件太多了。

通常我们使用Timer只有在时间到达了才会触发Handle，Boost的Handle会在Timer被取消、Timer被更新等等任何可能的情况下被触发。

好在，Boost的Timer Handle有一个固定的参数为error code，通过这个Error Code可以区别这些Handle被触发的原因。

Boost的Timer每次启动只会被触发一次。所以，如果需要循环，需要每次处理之后重启Timer（如下问代码中的start所示）。

```cpp
class clz{
public:
    clz(boost::asio::io_service &_io) : timer_(_io)
private:
    void on_timeout(const boost::system::error_code &_error)
    {
        if(_error.value() == boost::system::errc::errc_t::success) {
            ...
            start(t)
        }
    }
public:
    void start(int t)
    {
        timer_.expires_from_now(std::chrono::milliseconds(t));
        timer_.async_wait(
              std::bind(
	             &clz::on_timeout,
	             this, std::placeholders::_1));
    }
private:
    boost::asio::steady_timer timer_;
};
```

上例中的std::chrono::milliseconds存在多种形式，比如秒、微妙、毫秒、纳秒等等。可以根据实际的需要而选择。

# bind与function

使用std::bind和std::function可以非常灵活的传递c++的函数指针。

```cpp
class clz{
    void start_oneshot_timer(
            std::function<void(const boost::system::error_code &_error)> f,
            int t)
    {
        if(t == 0) {
            oneshot_timer_.cancel();
        }
        else {
            oneshot_timer_.expires_from_now(std::chrono::milliseconds(t));
            oneshot_timer_.async_wait(f);
        }
    }

    void on_timeout(const boost::system::error_code &_error)
    {
        ....
    }

    void start()
    {
        start_oneshot_timer(
            std::bind(&clz::on_timeout, this, std::placeholders::_1),
                100);
    }
};
```

注意，bind的一个很有趣的用法。可以在后面无限添加参数。这样就可以很灵活的定义On_Timer函数。

# mutex

GLib有一个所谓的“递归式互斥锁”（GRecMutex）。简单的说，这个锁在同一个线程内只计数不锁，跨线程才会锁。这就可以避免同一个线程内发生死锁问题。

```cpp
GRecMutex mutex;
g_rec_mutex_init(&mutex);
g_rec_mutex_lock(&mutex);
...
g_rec_mutex_unlock(&mutex);
```

在Boost中，也有类似的东西，boost::recursive_mutex。

```cpp
#include <boost/thread/recursive_mutex.hpp>

boost::recursive_mutex g_rec_mutex;
boost::recursive_mutex::scoped_lock lock(g_rec_mutex);
```

# pipe and fd

在glib中，我们通常可能使用g_io来监控文件描述符，来知晓是否有写入。

在boost中，也有类似的机制。

```cpp
GIOChannel *gio = g_io_channel_unix_new(pipe_fd[0]);
g_assert(gio != NULL);
GSource *gs = g_io_create_watch(gio, G_IO_IN);
g_assert(gs != NULL);
g_source_set_callback(gs , (GSourceFunc)g_source_fd_func, NULL, NULL);
g_assert(g_source_attach(gs, NULL) > 0);
```

```cpp
class clz {
public:
    ...
private:
     boost::asio::posix::stream_descriptor pipe_;
};

void clz::async_read_pipe()
{
    pipe_.async_read_some(boost::asio::buffer(pipe_buf_),
        boost::bind(&clz::on_read_pipe, this,
            boost::asio::placeholders::error,
            boost::asio::placeholders::bytes_transferred));
}

void clz::on_read_pipe(
                    const boost::system::error_code& ec, std::size_t bytes)
{
    if(!ec) {
        if(func_ != NULL) {
            func_(pipe_buf_);
        }
        async_read_pipe();
    }
    else {
        std::cerr << "read pipe handle error " << ec.message();
    }
}

void clz::bind_pipe(int _fd, std::function<void(vector<char>)> _func)
{
    func_ = _func;
    pipe_.assign(_fd);
    async_read_pipe();
}

int main(int argc, char *argv[])
{
    pipe2(pipe_fd, O_CLOEXEC);
    clz.bind_pipe(pipe_fd[0], on_pipe_fd_read);
}

```
