---
layout: post
title: 同一脚本内，kill 通过 sudo 启动的进程
tag: [Shell]
categories: [Linux]
---

<!--break-->

# 问题

简单的说，如下脚本中的`kill`是不会生效的。

```bash
#!/bin/bash
set -x
sudo sleep 10 &
PID=$!

sleep 2
sudo kill $PID

sleep 1
ps aux | grep sleep
```

参考： [Why does kill not work from script, but does work from terminal?](https://unix.stackexchange.com/a/625478) 。如果我没理解错的话，原因是：

`sudo` 不能用来 `kill` 同一个进程组内的其他进程。

# 解决方案

这里，使用 `setsid` 来重置 `sleep` 进程的进程组（注意：不是 `sudo sleep` ）。

然后，借助曾经在《 [Shell脚本中，等待所有子进程/孙进程退出](../wait-child-grandchild-quit/) 》中使用过的方法，通过查询 `sudo sleep` 的子进程的方式 `kill` 由 `sudo` 启动的 `sleep` 进程。

接下来，由于子进程退出（被 `kill`），`sudo sleep` 进程也会自动退出。


```bash
#!/bin/bash
set -x

sudo setsid sleep 10 &
PID=$!

sleep 2
WPIDs=($(ps -eo pid,ppid \
       | awk -v ppid=$PID '{if($2==ppid && $1!=ppid){print $1}}'))
for pid in ${WPIDs[@]} ; do
    if ps -p $pid > /dev/null ; then
        sudo kill $pid
    fi
done

sleep 1
ps aux | grep sleep
```
