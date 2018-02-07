---
layout: post
title: 根据进程ID获取Cached Memory情况
tag: [maps,Cached,Memory,Linux]
---


首先，利用/proc/pid/maps可以获取到进程关联的文件的列表。
其次，OpenSUSE中提供了一个工具fincore（包含在linux-ftools这个软件包中）可以获取指定文件的Cache情况。
<!--break-->

综合这两个工具，我做成了如下脚本，用于查看指定pid对应进程的Cached Memory。

```shell
#!/bin/bash

pid=$1

FILES=""

while read line
do
    parts=($line)
    if [ -e ${parts[5]} ] ; then
        FILES=$FILES" "${parts[5]}
    fi
done < /proc/${pid}/maps

FILES=$(echo ${FILES} | sed 's/ /\n/g' | sort -u | awk '{printf("%s ",$1)}')

linux-fincore --pages=false --summarize --only-cached ${FILES}
```

参照：

[linux-ftools' Source Code](https://opensuse.pkgs.org/42.3/opensuse-oss/linux-ftools-1.3-9.1.x86_64.rpm.html)

[How can you tell whether a file is being cached in memory in linux?](https://stackoverflow.com/questions/210809/how-can-you-tell-whether-a-file-is-being-cached-in-memory-in-linux)

[Help! Linux ate my RAM!](https://www.linuxatemyram.com/play.html)

[How do you empty the buffers and cache on a Linux system?](https://unix.stackexchange.com/questions/87908/how-do-you-empty-the-buffers-and-cache-on-a-linux-system)

[Drop a specific file from the Linux filesystem cache?](https://unix.stackexchange.com/questions/36907/drop-a-specific-file-from-the-linux-filesystem-cache)

[Understanding and optimizing Memory utilization](http://careers.directi.com/display/tu/Understanding+and+optimizing+Memory+utilization)
