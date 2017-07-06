---
layout: post
title: 通过Yocto整理工程依赖关系与授权信息
tag: [Yocto,License,Linux]
---

如果需要知道Yocto生成的images里面的软件包的依赖关系及授权信息，则可以通过Yocto自身的两个功能来实现。
<!--break-->


以Yocto默认的core-image-minimal为例。



每一次使用Yocto生成Image，都会默认生成一份License列表，保存的位置如下()：

```
user@debian:~/yocto/build$ ls tmp/deploy/licenses/core-image-minimal-${machine}-${datetime}/license.manifest
```



而使用“-g”参数可以获取到软件包依赖结果：

```
user@debian:~/yocto/build$ bitbake -g core-image-minimal
Loading cache: 100% |#############################################################| ETA:  00:00:00
Loaded 5171 entries from dependency cache.
NOTE: Resolving any missing task queue dependencies
NOTE: Preparing RunQueue
NOTE: PN build list saved to 'pn-buildlist'
NOTE: PN dependencies saved to 'pn-depends.dot'
NOTE: Package dependencies saved to 'package-depends.dot'
NOTE: Task dependencies saved to 'task-depends.dot'

```

其中的“package-depends.dot”即为软件包依赖关系。



接下来，可以使用如下脚本(dep.py)对这两个文件进行收集整理，生成基于FreeMind的依赖关系图。

<pre><code>

#!/usr/bin/python
# -*- coding: utf-8 -*-

import sqlite3, os, sys

root = sys.argv[1]
dpfile = sys.argv[2]
licfile = sys.argv[3]

searched = {}
licenses = {}

db = sqlite3.connect(":memory:")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

db.row_factory = dict_factory

cu = db.cursor()
cu.execute("\
    create table if not exists depends \
    ( \
        id INTEGER PRIMARY KEY ASC, \
        project TEXT, \
        depend TEXT\
    )")

def make_db():
    cu = db.cursor()
    for line in open(dpfile):
        line=line.strip('\n')

        if line.find(" -&gt; ") &gt;= 0:
            aline = line.split(' ')
            if len(aline) &gt;= 3:
                project = aline[0].replace("\"", "")
                depend = aline[2].replace("\"", "")
                if aline[1] == "-&gt;":
                    cu.execute("\
                        select * from depends \
                        where \
                            project='%s' and depend='%s'" % (project, depend))
                    f = cu.fetchone()
                    if not f:
                        cu.execute("\
                            insert into depends \
                            values (NULL, '%s', '%s')" % (project, depend))

def show_depends(db, proj, depelvel):

    searched[proj] = proj

    if depelvel == 1:
        output.write("&lt;map version=\"1.0.1\"&gt;\n")
        output.write("&lt;node \
                          COLOR=\"#000000\" \
                          CREATED=\"1498714017621\" \
                          ID=\"ID_1\" \
                          MODIFIED=\"1498714017621\" \
                          TEXT=\""+proj+"\"&gt;\n")
        output.write("&lt;icon BUILTIN=\"list\"/&gt;\n")

    depelvel = depelvel + 1

    cu = db.cursor()
    cu.execute("select d.* from depends as d \
                  where d.project='"+proj+"' order by d.depend")
    for row in cu:
        output.write("&lt;node \
                          COLOR=\"#000000\" \
                          CREATED=\"1498714017621\" \
                          FOLDED=\"true\" \
                          ID=\"ID_1\" \
                          MODIFIED=\"1498714017621\" \
                          STYLE=\"bubble\"&gt;\n")
        if depelvel &lt;= 10:
            if depelvel-1 == 1:
                output.write("&lt;cloud/&gt;\n");
            output.write("&lt;icon BUILTIN=\"full-"+str(depelvel-1)+"\"/&gt;\n");
        else:
            output.write("&lt;icon BUILTIN=\"freemind_butterfly\"/&gt;\n");
        output.write("&lt;richcontent TYPE=\"NODE\"&gt;")
        output.write("&lt;html&gt;&lt;head&gt;&lt;/head&gt;&lt;body width=\"\"&gt;")

        output.write(row['depend'])

        if row['depend'] in licenses:
            output.write("&lt;hr/&gt;")
            output.write(licenses[row['depend']])

        output.write("&lt;/body&gt;&lt;/html&gt;")
        output.write("&lt;/richcontent&gt;\n")

        if not row['depend'] in searched:
            show_depends(db, row['depend'], depelvel)

        output.write("&lt;/node&gt;\n")

    depelvel = depelvel - 1

    if depelvel == 1:
        output.write("&lt;/node&gt;\n")
        output.write("&lt;/map&gt;\n")

def load_licenses():
    for line in open(licfile):
        line=line.strip('\n')
        aline = line.split(' ')

        if line.find("RECIPE NAME: ") &gt;= 0:
            recipe = aline[2]
        if line.find("LICENSE: ") &gt;= 0:
            licenses[recipe] = line.replace("LICENSE: ", "")

load_licenses()

make_db()

output = open(root+".mm", 'w')
show_depends(db, root, 1)
output.close()

db.close()

</code></pre>



使用方法：

```
user@debian:~/yocto/build$ ./dep.py core-image-minimal package-depends.dot tmp/deploy/licenses/core-image-minimal-${machine}-${datetime}/license.manifest
```



等待片刻，就会生成一个名为“core-image-minimal.mm”的文件，使用FreeMind打开，即可以看到附带授权信息的软件包依赖关系图。



后记：

以上方法还存在一个缺陷，即“package-depends.dot”中的依赖关系是基于Yocto中的“PREFERRED_PROVIDER”设定的，而“license.manifest”不是。所以部分软件包到License的对应关系会缺失。如果需要等到更加完整的关系图，则还需要整理一下“PREFERRED_PROVIDER”对照关系。
