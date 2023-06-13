---
layout: post
title: 一个简易的DLT服务
tag: [COVESA,DLT]
categories: [Program]
---

当目标系统不支持Dlt时，可以作为一个备选方案。

<!--break-->

要读懂下面代码的话，可能需要先阅读一下AUTOSAR的DLT标准协议。
注释中标注的类似宏定义的大写字母单词都是来自于AUTOSAR协议的，可以直接使用它们进行搜索。


```cpp
//
// async_tcp_echo_server.cpp
// ~~~~~~~~~~~~~~~~~~~~~~~~~
//
// Copyright (c) 2003-2020 Christopher M. Kohlhoff (chris at kohlhoff dot com)
// Copyright (c) 2020 Charles Chan (charles at zeerd dot com)
//
// Distributed under the Boost Software License, Version 1.0. (See accompanying
// file LICENSE_1_0.txt or copy at http://www.boost.org/LICENSE_1_0.txt)
//

/*
    g++ simple-dlt-server.cpp -o simple-dlt-server \
                              -lboost_system -lboost_thread \
                              -pthread
*/

/*
    https://www.autosar.org/fileadmin/user_upload/standards/foundation/1-0/
                                AUTOSAR_PRS_DiagnosticLogAndTraceProtocol.pdf
    https://at.projects.genivi.org/wiki/display/PROJ/
                                GENIVI+DLT+Protocol+Extensions
    https://github.com/GENIVI/dlt-viewer
*/


#include <sys/types.h>                  // getpid()
#include <unistd.h>                     // getpid()

#include <cstdlib>
#include <iostream>
#include <memory>
#include <utility>
#include <boost/asio.hpp>
#include <boost/asio/steady_timer.hpp>
#include <boost/thread/recursive_mutex.hpp>

#define _WORD_BYTE0(x) (uint8_t((x) & 0xFF))
#define _WORD_BYTE1(x) (uint8_t((x) >> 8))

#define _LONG_BYTE0(x) (uint8_t((x) & 0xFF))
#define _LONG_BYTE1(x) (uint8_t(((x) >> 8) & 0xFF))
#define _LONG_BYTE2(x) (uint8_t(((x) >> 16) & 0xFF))
#define _LONG_BYTE3(x) (uint8_t(((x) >> 24) & 0xFF))

const char * ecuid = "ECU1";
const char * apid = "TST";
const char * apds = "simple dlt server";
const char * ctid = "SMP";
const char * ctds = "simple dlt server context";
const char * ver = "Simple DLT Server Version 0.0.1";

using boost::asio::ip::tcp;

class session
  : public std::enable_shared_from_this<session>
{
public:
    session(boost::asio::io_context& io_context, tcp::socket socket)
        : io_context_(io_context)
        , socket_(std::move(socket))
        , timer_(std::make_shared<boost::asio::steady_timer>(io_context_))
        , counter(0) {
    }

    void start()
    {
        say_connected();
        do_read();

        /**
         * This timer used to send a demo-message to DLT-Viewer.
         * It's not a part of the core.
         */
        timer_->expires_from_now(std::chrono::seconds(1));
        timer_->async_wait(std::bind(&session::do_dlt_demo,
                    shared_from_this(), std::placeholders::_1));
    }

private:
    /**
     * The DLT Viewer might want to get some information of our DLT server.
     * The do_read() function used to receive the requests from DLT viewer
     * and give callbacks.
     */
    void do_read()
     {
        auto self(shared_from_this());
        socket_.async_read_some(boost::asio::buffer(data_, max_length),
            [this, self](boost::system::error_code ec, std::size_t _length) {
                if (!ec) {
                    // TODO: I am not sure if there would be a half-PDU coming
                    //       Maybe need to store the remains for next time.
                    int offset = 0;
                    char dlt[max_length] = {0};
                    int length = data_[2] << 8 | data_[3];
                    while(offset + length <= _length) {
                        length = data_[offset+2] << 8 | data_[offset+3];
                        uint8_t type = data_[offset+12];
                        uint8_t command = data_[offset+22];

                        if(type == 0x16) { // DLT_CONTROL_REQUEST
                            if(command == 0x13) { // Get ECU Software Version
                                get_ecu_software_version();
                            }
                            else if(command == 0x03) { // Get Log Info
                                get_log_info();
                            }
                            else {
                                // Do not support any other requests.
                                memcpy(dlt, &data_[offset], 0x1a);
                                dlt[ 2] = 0;
                                dlt[ 3] = _WORD_BYTE0(27);
                                dlt[ 7] = 0x31; // modify the ECU ID
                                dlt[12] = 0x26;
                                dlt[26] = 1; // NOT_SUPPORTED
                                do_write(dlt, 27);
                            }
                        }
                        offset += length;
                    }

                    do_read();
                }
            });
    }

    /**
     * Send data from DLT-Server on ECU to DLT-Viewer on PC.
     */
    void do_write(char *_data, std::size_t length)
    {
        boost::recursive_mutex::scoped_lock lock(g_rec_mutex_);
        auto self(shared_from_this());
        boost::asio::async_write(socket_, boost::asio::buffer(_data, length),
            [this, self](boost::system::error_code ec, std::size_t /*length*/) {
                if (!ec) {
                    // Do something when error occur.
                }
            });
    }

    /**
     * Send a DLT-Log with random log level.
     */
    void do_dlt_demo(const boost::system::error_code &_error)
    {
        if(_error.value() == boost::system::errc::errc_t::success) {

            send_dlt_message((random() % 6), "Hello, DLT!");

            timer_->expires_from_now(std::chrono::seconds(1));
            timer_->async_wait(std::bind( &session::do_dlt_demo,
                    shared_from_this(), std::placeholders::_1));
        }
    }

    /**
     * This information is not defined from the AUTOSAR.
     * It mIght be defined by GENIVI for DLT-Viewer Only.
     */
    void say_connected()
    {
        char dlt[max_length] = {0};

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

        do_write(dlt, 32);
    }

    /**
     * Tell The DLT-Viewer who we are, if it asked.
     */
    void get_ecu_software_version()
    {
        char dlt[max_length] = {0};

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
        dlt[o++] = 0x26; //
        dlt[o++] = 0x01; // Number of Arguments = 1
        memcpy(&dlt[o], apid, 4); o += 4;
        memcpy(&dlt[o], ctid, 4); o += 4;
        dlt[o++] = 0x13; // 5.3.10 Get ECU Software Version
        dlt[o++] = 0x00;
        dlt[o++] = 0x00;
        dlt[o++] = 0x00;
        dlt[o++] = 0; // 0 == OK
        dlt[o++] = strlen(ver); // Length of the string swVersion
        dlt[o++] = 0; // Length of the string swVersion
        dlt[o++] = 0; // Length of the string swVersion
        dlt[o++] = 0; // Length of the string swVersion
        memcpy(&dlt[o], ver, strlen(ver)); o += strlen(ver);

        dlt[ 2] = _WORD_BYTE1(o);
        dlt[ 3] = _WORD_BYTE0(o);

        do_write(dlt, o);
    }

    /**
     * Send all the registered application and contents to DLT-Viewer.
     * We got only one application and only one content here, so it's simple.
     * Need more loops for more application and more contents.
     */
    void get_log_info()
    {
        char dlt[max_length] = {0};

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
        dlt[o++] = 0x26; //
        dlt[o++] = 0x01; // Number of Arguments = 1
        memcpy(&dlt[o], apid, 4); o += 4;
        memcpy(&dlt[o], ctid, 4); o += 4;
        dlt[o++] = 0x03; // 5.3.3 Get Log Info
        dlt[o++] = 0x00;
        dlt[o++] = 0x00;
        dlt[o++] = 0x00;
        dlt[o++] = 7; // all apid & cnid
        dlt[o++] = 1; // only one app
        dlt[o++] = 0; // split
        memcpy(&dlt[o], apid, 4); o += 4;
        dlt[o++] = 1; // only one content id
        dlt[o++] = 0; // split
        memcpy(&dlt[o], ctid, 4); o += 4;
        dlt[o++] = 0xff; // level of log by default
        dlt[o++] = 0xff; // status of trace by default
        dlt[o++] = strlen(ctds); // length
        dlt[o++] = 0; // length
        memcpy(&dlt[o], ctds, strlen(ctds)); o += strlen(ctds);
        dlt[o++] = strlen(apds); // length
        dlt[o++] = 0; // length
        memcpy(&dlt[o], apds, strlen(apds)); o += strlen(apds);

        dlt[ 2] = _WORD_BYTE1(o);
        dlt[ 3] = _WORD_BYTE0(o);
        do_write(dlt, o);
    }

    /**
     * Core function to send a log.
     */
    void send_dlt_message(int level, const char * _msg)
    {
        char dlt[max_length] = {0};

        uint16_t length = strlen(_msg);
        uint32_t session_id = getpid();
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
        dlt[o++] = 0x11 + (level << 4); // (DLT_LOG_xxx by random)
                                        // (Dlt Log Message) (Verbose)
        dlt[o++] = 0x01; // Number of Arguments = 1
        memcpy(&dlt[o], apid, 4); o += 4;
        memcpy(&dlt[o], ctid, 4); o += 4;
        dlt[o++] = 0x00;
        dlt[o++] = 0x02;
        dlt[o++] = 0x00;
        dlt[o++] = 0x00; // Bit9=1 : Type String = ASCII
                         // (String Coding=0, Type Length = not defined)
        dlt[o++] = _WORD_BYTE0(length);
        dlt[o++] = _WORD_BYTE1(length);
        memcpy(&dlt[o], _msg, length); o += length;
        dlt[o++] = '\0';

        dlt[2] = _WORD_BYTE1(o); /* header + extend header */
        dlt[3] = _WORD_BYTE0(o); /* header + extend header */
        do_write(dlt, o);
    }

    uint32_t dlt_timestamp()
    {
        struct timespec ts;

        if (clock_gettime(CLOCK_MONOTONIC, &ts) == 0)
            return (uint32_t)ts.tv_sec  * 10000
                 + (uint32_t)ts.tv_nsec / 100000; /* in 0.1 ms = 100 us */
        else
            return 0;
    }

    boost::asio::io_context& io_context_;
    tcp::socket socket_;
    std::shared_ptr<boost::asio::steady_timer> timer_;
    boost::recursive_mutex g_rec_mutex_;
    enum { max_length = 1024 };
    char data_[max_length];
    int counter;
};

/**
 * DLT-Server iS a TCP server. DLT-Viewer is a TCP Client.
 * Those codes come from the example of boost TCP server:
 * async_tcp_echo_server.cpp
 */
class server
{
public:
    server(boost::asio::io_context& io_context, short port)
        : io_context_(io_context)
        , acceptor_(io_context, tcp::endpoint(tcp::v4(), port)) {
        do_accept();
    }

private:
    void do_accept()
    {
        acceptor_.async_accept(
            [this](boost::system::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::make_shared<session>
                            (io_context_, std::move(socket))->start();
                }

                do_accept();
            });
    }

    boost::asio::io_context& io_context_;
    tcp::acceptor acceptor_;
};

int main(int argc, char* argv[])
{
    try {
        uint32_t port = 3490;
        if (argc == 2) {
            port = std::atoi(argv[1]);
            if(port == 0) {
                std::cerr << "Usage: simple-dlt-server [port default:3490]\n";
                return 1;
            }
            std::cout << "Listening on " << port << std::endl;
        }

        boost::asio::io_context io_context;

        server s(io_context, port);

        io_context.run();
    }
    catch (std::exception& e) {
        std::cerr << "Exception: " << e.what() << "\n";
    }

    return 0;
}
```
