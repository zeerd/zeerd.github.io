---
layout: post
title: Shell脚本中，等待所有子进程/孙进程退出
tag: [Shell]
categories: [Program]
---

为了达成这个目标，需要实现两件事情。

<!--break-->

1. 找到所有的子进程和孙进程以及更下级的进程；
2. 等待这些进程的退出。


比较麻烦的地方在于，如果子进程在孙进程之前退出了，就无法通过常规方式定位孙进程。

例如这个脚本，在后台执行`sleep 3`之后，`child.sh`就退出了。

`child.sh`

```shell
#!/bin/bash

sleep 3 &

```

一个做法是，通过`ps -j`命令来定位所有下级进程。

这个命令会多列出两列，分别为PGID和SID。形式如下：

```
    PID    PGID     SID TTY          TIME CMD
  19787   19787   19787 pts/1    00:00:00 bash
 136856  136856   19787 pts/1    00:00:00 ps
```

前者是“Process Group ID”的缩写，表示进程组的标识符；
后者是“Session ID”的缩写，表示进程会话的标识符。

可以通过查找所有PGID为自身ID的进程的方式来定位所有下级进程。

然后，通过`tail --pid=$pid`来等待进程退出。

下面是一个示例脚本：

```shell
#!/bin/bash

timeout=5

date

./child.sh

WPIDs=$(ps -j | awk -v pid=$$ '{if($2==pid && $1!=pid){print $1}}')

for pid in ${WPIDs[@]} ; do
    if ps -p $pid > /dev/null ; then
        echo waiting for $pid `ps $pid | tail -n 1`
        timeout $timeout tail --pid=$pid -f /dev/null
    fi
done

date

```

执行结果如下：

```
2023年 07月 05日 星期四 22:43:32 CST
waiting for 16008 16008 pts/0 S+ 0:00 sleep 3
2023年 07月 05日 星期四 22:43:35 CST
```

可以看到，脚本执行了3秒钟。也就是等待`sleep`孙进程退出的时间。

当然，为了避免出现问题时导致脚本卡死。还使用了`timeout`命令来进行控制。
将上述`child.sh`中的`3`改成`10`。就可以看到，脚本在第5秒`timeout`退出。

参照：

《 [Wait for a process to finish](https://stackoverflow.com/questions/1058047/wait-for-a-process-to-finish) 》
《 [How do I wait for all child processes but one to finish executing](https://unix.stackexchange.com/questions/167337/how-do-i-wait-for-all-child-processes-but-one-to-finish-executing) 》
