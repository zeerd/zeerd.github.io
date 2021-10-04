---
layout: post
title: 利用taglib和sqlite实现简易的媒体数据库
tag: [TagLib,Sqlite]
---
现在的各种媒体播放器及用户，已经不再满足于仅将文件系统中的目录结构罗列出来以供听众选择的传统操作方式了。越来越多的媒体播放器开始支持按着演唱者（artist）、专辑名称（album）来进行歌曲的归类和播放。

<!--break-->

下面的内容，是我参照Banshee的数据库结构进行删改之后，生成的一个简单的媒体数据库生成和查询的例子。

可以实现简单的数据库建立以及分类查找。



首先是一个针对媒体文件内tag信息的解析过程。这个过程使用taglib实现。我没有自己写太多的代码，直接拿来taglib的examples中的framelist.cpp来进行修改。主要是修改了输出格式。另外，原本taglib中附带的例子没有专辑图片（artwork）的读取部分。我参照taglib的源代码，企图使用attachedpictureframe类进行图片的读取。但是不知道什么原因，这个类读出来的图片（picture()函数）的大小是错误的，在我的试验中仅能生成1/3的图片。所以，我自己根据APIC的格式写了一个简单的读取处理。

<b>tagreader.cpp</b>

```cpp
/* Copyright (C) 2003 Scott Wheeler <wheeler@kde.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include <iostream>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#include <taglib/tbytevector.h>

#include <taglib/mpegfile.h>

#include <taglib/id3v2tag.h>
#include <taglib/id3v2frame.h>
#include <taglib/id3v2header.h>

#include <taglib/id3v1tag.h>

#include <taglib/apetag.h>
#include <taglib/attachedpictureframe.h>


using namespace std;
using namespace TagLib;

int main(int argc, char *argv[])
{
  // process the command line args
  char szTitle[256]="";
  char szAlbum[256]="";
  char szArtist[256]="";
  char szArtwork[256]="";

  for(int i = 1; i < argc; i++) {

    MPEG::File f(argv[i]);

    ID3v2::Tag *id3v2tag = f.ID3v2Tag();

    if(id3v2tag) {

      ID3v2::FrameList::ConstIterator it = id3v2tag->frameList().begin();
      for(; it != id3v2tag->frameList().end(); it++){
        if(id3v2tag->header()->majorVersion()==3 && id3v2tag->header()->revisionNumber()==0){
          if ((*it)->frameID() == "TIT2"){
            strcpy(szTitle, (*it)->toString().toCString());
          }
          if ((*it)->frameID() == "TPE1"){
            strcpy(szArtist, (*it)->toString().toCString());
          }
          if ((*it)->frameID() == "TALB"){
            strcpy(szAlbum, (*it)->toString().toCString());
          }
          if ((*it)->frameID() == "APIC"){
            ID3v2::AttachedPictureFrame *apf =
              static_cast<TagLib::ID3v2::AttachedPictureFrame*>(id3v2tag->frameListMap()["APIC"].front());
            if(apf != NULL){
              char pic_file[256]="";
              strcpy(pic_file,  argv[i]);
              strcat(pic_file, ".");
              strcat(pic_file, strchr( apf->mimeType().toCString(), '/')+1);
              FILE *out = fopen(pic_file, "w");
              if(out != NULL){
                for(int i=0;i<apf->picture().size() ;i++){
                  fprintf(out, "%c", apf->picture().at(i) );
                }
                fclose(out);
              }
            }
          }
        }
      }
    }
  }

  cout << szTitle << " " << szArtist << " " << szAlbum << " " << szArtwork << endl;
}
```


接下来这个文件是一个shell脚本。实现了数据库的创建、文件结构解析、数据库登录、查询的最基本的简单功能。
本来打算用C/C++来写，但实在是没有太多的linux开发经验，一时也不知道去哪里翻看linux下的文件系统相关的库函数。所以就偷懒使用shell脚本编写了。反正就是一个例子，也不需要多高的执行效率之类的。

<b>tagreader.sh</b>

```bash
#!/bin/bash
#

SQLITE_CMD=sqlite3
DB_NAME=test.db
CC=g++
TAG_READER=./tagreader

folder_cnt=0
track_id_idx=0
artist_id_idx=-1

#
# 在这里创建了数据库结构。结构很简单，我就不画图了。直接看吧。
function create_db(){
  echo --- creating database ---
  $SQLITE_CMD $DB_NAME "Create TABLE coretracks (track_id INTEGER PRIMARY KEY, album_id INTEGER, artist_id INTEGER, folder_id INTEGER, title TEXT, file_name TEXT, uri_path TEXT, uri_artwork TEXT);"
  $SQLITE_CMD $DB_NAME "Create TABLE corealbums (album_id INTEGER PRIMARY KEY, artist_id INTEGER, title TEXT, artist_name TEXT, uri_artwork TEXT);"
  $SQLITE_CMD $DB_NAME "Create TABLE coreartists (artist_id INTEGER PRIMARY KEY, name TEXT);"
  $SQLITE_CMD $DB_NAME "Create TABLE corefolders (folder_id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER);"
}

# 这个函数用来递归解析给定的路径及其子路径下的媒体文件。这里为了简化流程，仅对扩展名为mp3的文件进行了解析。
# 函数传入了四个参数，分别是：当前路径（绝对路径）、将要进入的子路径名称、当前已经计数到的folder id、父路径的folder id
function cntsana(){
  local full_working_folder=$1"/"$2
  local current_folder=$2
  local folder_id_idx=$[$3+1]
  local parent_folder_id=$4
  folder_cnt=$[$folder_cnt+1]
  $SQLITE_CMD $DB_NAME "insert into corefolders values( $folder_cnt, \"$current_folder\", $parent_folder_id);"
  for file in `ls $full_working_folder -A`
  do
    if [ -d $full_working_folder"/"$file ]
    then
      cntsana $full_working_folder $file $folder_cnt $folder_id_idx
    else
      local path=$full_working_folder"/"$file
      local name=$file
      ext=${path##*.}
      if [[ $ext == "mp3" ]];then
        # 调用前面的cpp程序进行tag解析
        tag_string=(`$TAG_READER $path`)
        title=${tag_string[0]}
        artist=${tag_string[1]}
        album=${tag_string[2]}
        artwork=${tag_string[3]}
        sql_result=`$SQLITE_CMD $DB_NAME "select count() from coreartists where name=\"$artist\";"`
        if [[ $sql_result == 0 ]];then
          artist_cnt=`$SQLITE_CMD $DB_NAME "select count() from coreartists;"`
          artist_id_idx=$[$artist_cnt+1]
          sql_result=`$SQLITE_CMD $DB_NAME "insert into coreartists values( $artist_id_idx, \"$artist\");"`
        else
          artist_id_idx=`$SQLITE_CMD $DB_NAME "select artist_id from coreartists where name=\"$artist\";"`
        fi

        sql_result=`$SQLITE_CMD $DB_NAME "select count() from corealbums where title=\"$album\" and artist_name=\"$artist\";"`
        if [[ $sql_result == 0 ]];then
          album_cnt=`$SQLITE_CMD $DB_NAME "select count() from corealbums;"`
          album_id_idx=$[$album_cnt+1]
          sql_result=`$SQLITE_CMD $DB_NAME "insert into corealbums values( $album_id_idx, $artist_id_idx, \"$album\", \"$artist\", \"$artwork\");"`
        else
          album_id_idx=`$SQLITE_CMD $DB_NAME "select album_id from corealbums where title=\"$album\" and artist_name=\"$artist\";"`
        fi

        $SQLITE_CMD $DB_NAME "insert into coretracks values( $track_id_idx, $album_id_idx, $artist_id_idx, $folder_id_idx, \"$title\", \"$name\",  \"$path\", \"$artwork\");"
        track_id_idx=$[$track_id_idx+1]
      fi
    fi
  done
}

# 以tag为基准进行的媒体查询函数
function tag_list(){
  local artist_list=(`$SQLITE_CMD $DB_NAME "select name from coreartists;"`)
  local artist_cnt=${#artist_list[@]}
  for i in $( seq 1 ${artist_cnt} )
  do
    echo $i -- ${artist_list[i-1]}
  done
  echo -n "Please choose the artist:"
  read chosen_artist_idx
  echo You are chosen the ${artist_list[$chosen_artist_idx-1]} ...
  chosen_artist_id=`$SQLITE_CMD $DB_NAME "select artist_id from coreartists where name=\"${artist_list[$chosen_artist_idx-1]}\";"`

  local album_list=(`$SQLITE_CMD $DB_NAME "select title from corealbums where artist_name=\"${artist_list[$chosen_artist_idx-1]}\";"`)
  local album_cnt=${#album_list[@]}
  for i in $( seq 1 ${album_cnt} )
  do
    echo $i -- ${album_list[i-1]}
  done
  echo -n "Please choose the album:"
  read chosen_album_idx
  echo You are chosen the ${album_list[$chosen_album_idx-1]} ...
  chosen_album_id=`$SQLITE_CMD $DB_NAME "select album_id from corealbums where artist_name=\"${artist_list[$chosen_artist_idx-1]}\" and title=\"${album_list[$chosen_album_idx-1]}\";"`

  local track_list=(`$SQLITE_CMD $DB_NAME "select title from coretracks where artist_id=$chosen_artist_id and album_id=$chosen_album_id;"`)
  local track_cnt=${#track_list[@]}
  for i in $( seq 1 ${track_cnt} )
  do
    echo $i -- ${track_list[i-1]}
  done
  echo -n "Please choose the track:"
  read chosen_track_idx
  local track_path_list=(`$SQLITE_CMD $DB_NAME "select uri_path from coretracks where artist_id=$chosen_artist_id and album_id=$chosen_album_id;"`)
  echo You are choosing the \"${track_list[$chosen_track_idx-1]}\" of the album \"${album_list[$chosen_album_idx-1]}\" singing by \"${artist_list[$chosen_artist_idx-1]}\" in the filesystem \"${track_path_list[$chosen_track_idx-1]}\".
}

# 传统的，以文件系统结构为基准进行的媒体查询函数
function folderfile_list(){
  local chosen_folder_id=-1
  local chosen_parent_id=1
  while ([[ $folder_chosen_idx != 0 ]])
  do
    local folder_list=(`$SQLITE_CMD $DB_NAME "select name from corefolders where parent_id=$chosen_parent_id;"`)
    local folder_cnt=${#folder_list[@]}
    if [[ $folder_cnt != 0 ]];then
      echo 0 -- show file list
      for i in $( seq 1 ${folder_cnt} )
      do
        echo $i -- ${folder_list[i-1]}
      done
      echo x -- back to parent
      echo -n "Please choose the folder:"
      read folder_chosen_idx
      if [[ $folder_chosen_idx == "x" ]];then
        echo You are chosen to back to parent ...
        chosen_folder_id=`$SQLITE_CMD $DB_NAME "select parent_id from corefolders where folder_id=$chosen_parent_id;"`
        chosen_parent_id=$chosen_folder_id
      elif [[ $folder_chosen_idx != 0 ]];then
        echo You are chosen the ${folder_list[$folder_chosen_idx-1]} ...
        chosen_folder_id=`$SQLITE_CMD $DB_NAME "select folder_id from corefolders where name=\"${folder_list[$folder_chosen_idx-1]}\";"`
        chosen_folder_name=${folder_list[$folder_chosen_idx-1]}
        chosen_parent_id=$chosen_folder_id
      fi
    else
      break
    fi
  done

  track_list=(`$SQLITE_CMD $DB_NAME "select file_name from coretracks where folder_id=$chosen_folder_id;"`)
  track_cnt=${#track_list[@]}
  for i in $( seq 1 ${track_cnt} )
  do
    echo $i -- ${track_list[i-1]}
  done
  echo -n "Please choose the file:"
  read chosen_track_idx
  track_path_list=(`$SQLITE_CMD $DB_NAME "select uri_path from coretracks where folder_id=$chosen_folder_id;"`)
  echo You are choosing the \"${track_list[$chosen_track_idx-1]}\" of the folder \"$chosen_folder_name\" in the filesystem \"${track_path_list[$chosen_track_idx-1]}\".
}

#main
if [[ ! -f $TAG_READER ]];then
  $CC tagreader.c -L/usr/local/lib -ltag -o $TAG_READER
fi

if [[ -f $DB_NAME ]];then
  rm -f $DB_NAME
fi
create_db

work_root_path=$1
if [[ $work_root_path == "" ]];then
  work_root_path=`pwd`
else
  if [[ ${work_root_path:0:1} != "/" && ${work_root_path:0:1} != "~" ]];then
    work_root_path=`pwd`/$work_root_path
  fi
fi

cntsana $work_root_path "." 0 0

echo 1 -- tag list
echo 2 -- folderfile list
echo x -- exit
echo -n "Please choose the list type:"
read list_type_idx
if [[ $list_type_idx == 1 ]];then
  tag_list
elif [[ $list_type_idx == 2 ]];then
  folderfile_list
fi
```

以上都是很简单的函数实现，我就不多做解释了。希望能对读者有所帮助。
