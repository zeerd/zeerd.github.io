---
layout: post
title: 递归替换指定路径及子路径下的文件扩展名
tag: [Shell]
categories: [Linux]
---

一个shell脚本。用于递归替换指定路径及子路径下的文件扩展名。
我不清楚是否linux下已经有命令可以实现了……

<!--break-->

```bash
#!/bin/bash

function chgext(){
  for file in ` ls $1 -A`
  do
    if [ -d $1"/"$file ]
    then
      chgext $1"/"$file $2 $3
    else
      local path=$1"/"$file  #得到文件的完整的目录
      local name=$file        #得到文件的名字

      local file_ext=${name##*.}
      local file_head=${name%.*}

      if [[ $file_ext == $2 ]];then
        echo $1"/"$file_head.$2 " => " $file_head.$3
        mv $1"/"$file_head.$2 $1"/"$file_head.$3
      fi

    fi
  done
}

# $1 -- workpath
# $2 -- extname from
# $3 -- extname to
# Example : chgext.sh . php html
#           Change all *.php to *.html including the subdirectories
chgext $1 $2 $3
```
