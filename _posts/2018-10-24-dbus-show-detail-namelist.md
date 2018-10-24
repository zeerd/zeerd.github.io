---
layout: post
title: 查看DBus的sender属于哪个进程
tag: [Linux,DBus]
---

将数字化的sender name转换成进程名称。

<!--break-->

通过dbus-monitor监控通讯时，看到的sender几乎全都是一串数字（Unique Connection Name[^1]）。而大部分时候，我们希望确切的知道每个sender究竟是谁。

下面的脚本可以用来列出所有sender对应的进程的PID和进程名称。

```bash
#!/bin/bash

AWK="busybox awk"
TR="busybox tr"

echo checking...

lists=$(dbus-send \
            --session \
            --dest=org.freedesktop.DBus \
            --type=method_call \
            --print-reply \
            /org/freedesktop/DBus org.freedesktop.DBus.ListNames \
      | $AWK '{if($1=="string") {n=$2;gsub("\"","",n);print n}}')

for i in $lists
do
        name="string:$i"
        #echo $name
        PID=$(dbus-send \
                    --session \
                    --print-reply \
                    --dest=org.freedesktop.DBus \
                    / \
                    org.freedesktop.DBus.GetConnectionUnixProcessID $name \
            2>&1 \
            | $AWK '{if($1=="uint32")print $2}')
        #echo $PID
        if [ "x$PID" != "x" ] ; then
                echo -ne $i "\t" $PID "\t"
                cat  /proc/$PID/cmdline | $TR "\0" " "
                echo
        fi
done | sort
```

参照：

[Find out the owner of a DBus service name](https://unix.stackexchange.com/questions/379810/find-out-the-owner-of-a-dbus-service-name)

[How to parse /proc/pid/cmdline](https://stackoverflow.com/questions/1585989/how-to-parse-proc-pid-cmdline)

[How to process a while-do loop and sort the iterated output](https://unix.stackexchange.com/questions/166750/how-to-process-a-while-do-loop-and-sort-the-iterated-output)

--------

[^1]:https://dbus.freedesktop.org/doc/dbus-specification.html#term-unique-name
