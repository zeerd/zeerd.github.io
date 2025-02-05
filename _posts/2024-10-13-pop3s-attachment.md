---
layout: post
title: 使用 mailio 收取邮件并保存附件
tag: [mailio]
categories: [Linux]
---

<!--break-->

https://github.com/karastojko/mailio


```cpp
#include <iostream>
#include <string>
#include <fstream>
#include <filesystem>
#include <mailio/message.hpp>
#include <mailio/pop3.hpp>

using mailio::codec;
using mailio::dialog_error;
using mailio::message;
using mailio::pop3_error;
using mailio::pop3s;
using mailio::string_t;
using std::cout;
using std::endl;
using std::ofstream;
using std::string;

int main(int argc, char *argv[])
{
    if (argc < 3)
    {
        printf("%s <pop3.server.address> <port> <user> <pass>\n", argv[0]);
        return EXIT_FAILURE;
    }

    try
    {
        // use a server with SSL connectivity
        pop3s conn(argv[1], atoi(argv[2]));
        // modify to use real account
        conn.authenticate(argv[3], argv[4], pop3s::auth_method_t::LOGIN);

        pop3s::message_list_t list = conn.list();
        cout << "Message count on server: " << list.size() << endl;
        for (auto &m : list)
        {
            cout << "Message " << m.first << " size: " << m.second << endl;

            // mail message to store the fetched one
            message msg;
            // set the line policy to mandatory, so longer lines could be parsed
            msg.line_policy(codec::line_len_policy_t::MANDATORY);
            conn.fetch(m.first, msg);
            string_t sub = msg.subject_raw();
            cout << "Received message with subject [" << sub.charset << "]"
                 << sub.buffer << endl;
            size_t i, count = msg.attachments_size();
            cout << "Attachment : " << count << endl;
            for (i = 0; i < count; i++)
            {
                string tmp = string("attachment") + std::to_string(i) + ".tmp";
                ofstream ofs(tmp,
                             std::ios::binary);
                string_t att;
                msg.attachment(i + 1, ofs, att);
                string saved = sub.buffer + "/" + att.buffer;

                // make dir by subject and move attachment to the dir
                std::filesystem::create_directory(sub.buffer);
                std::filesystem::rename(tmp, saved);
                cout << "Received message with subject `" << msg.subject()
                     << "` and attached file `" << att
                     << "` saved as `" << saved << "`." << endl;
            }
        }
    }
    catch (pop3_error &exc)
    {
        cout << exc.what() << endl;
    }
    catch (dialog_error &exc)
    {
        cout << exc.what() << endl;
    }

    return EXIT_SUCCESS;
}
```
