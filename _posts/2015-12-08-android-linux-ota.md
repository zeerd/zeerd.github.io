---
layout: post
title: Linux下实现增量升级（差分升级）
tag: [Android,Linux,OTA,bsdiff]
---
Android手机的差分升级功能很让人羡慕，其实调查一下就会发现，原理非常简单。<br>
<!--break-->
Android手机的差分升级功能很让人羡慕，其实调查一下就会发现，原理非常简单。

下面我来给出一些Linux下的Shell脚本，演示一下怎么样使用bsdiff实现简单的差分升级功能。

 

首先，需要做成差分升级包。

ota_make.sh
```shell
#!/bin/bash

newroot=
oldroot=
BSDIFF=bsdiff

function difffunc()
{
    #echo checking $1 $2 $3

    for x in $(ls -a1 $1)
    do
        if [ "$x" == "." ] ; then
            ls > /dev/null
        elif [ "$x" == ".." ] ; then
            ls > /dev/null
        elif [ -d $1/$x ] ; then
            install -d $3/$x
            echo ">>>>>>>>working in $1/$x<<<<<<<<"
            difffunc $1/$x $2/$x $3/$x $4/$x $5/$x
        else
            #echo $1/$x.p
            if [ -L $2/$x ] ; then
                if [ -L $1/$x ] ; then
                    newlink=$(readlink -f $1/$x)
                    oldlink=$(readlink -f $2/$x)
                    #echo ${newlink#$newroot} vs ${oldlink#$oldroot}
                    if [ ${newlink#$newroot} != ${oldlink#$oldroot} ] ; then
                        install -d $(dirname $5/$x)
                        cp -P $1/$x $5/$x
                    fi
                else
                    install -d $(dirname $4/$x)
                    cp $1/$x $4/$x
                fi
            else
                if [ -e $2/$x ] ; then
                    if [ -e $1/$x ] ; then
                        diff $2/$x $1/$x > /dev/null
                        if [ $? != 0 ] ; then
                            $BSDIFF $2/$x $1/$x $3/$x.p
                        fi
                    else
                        # need delete ?
                        ls > /dev/null
                    fi
                else
                    install -d $(dirname $4/$x)
                    cp $1/$x $4/$x
                fi
            fi
        fi
    done
}

if [ -z $3 ] ; then
    echo $0 newpath oldpath patchpath
else
    install -d $3/patch
    install -d $3/add
    install -d $3/link

    if [ ${1:0:1} != '/' ] ; then
        newroot="$( cd $1; pwd )"/$1
    else
        newroot=$1
    fi

    if [ ${2:0:1} != '/' ] ; then
        oldroot="$( cd $2; pwd )"/$2
    else
        oldroot=$2
    fi

    echo ${newroot} vs ${oldroot}

    difffunc $1 $2 $3/patch $3/add $3/link
fi
```

差分升级包做成时需要注意三种情况：
1、普通的文件，也就是那些需要查分的文件。实用bsdiff生成查分文件即可。
2、新增加的文件。bsdiff不能处理。需要独立拷贝。
3、link文件。需要考虑，在新的版本中，可能某些link文件指向不同的文件了。这是要对link文件进行特别的处理。

 

 

做成差分包之后就是如何使用差分包来升级了。

```shell
#!/bin/bash

BSPATCH=./bsdiff-4.3/bspatch

function patchfunc()
{
    for x in $(ls -a1 $3)
    do
        if [ "$x" == "." ] ; then
            ls > /dev/null
        elif [ "$x" == ".." ] ; then
            ls > /dev/null
        elif [ -d $3/$x ] ; then
        	install -d $1/$x
            echo ">>>>>>>>working in $3/$x<<<<<<<<"
            patchfunc $1/$x $2/$x $3/$x
        else
        	#echo $3/$x
            file=${x:0:-2}
            rm -f $1/$file
        	$BSPATCH $2/$file $1/$file $3/$x
            chmod --reference=$2/$file $1/$file
        fi
    done
}

if [ -z $3 ] ; then
    echo $0 newpath oldpath patchpath
else
    cp -r $2 $1
    patchfunc $1 $2 $3/patch

    cp -r $3/add/* $1/
    cp -rP $3/link/* $1/
fi
```

升级就是前面的你过程，不再多说。

最后，写个脚本用来测试。

  
```shell
#!/bin/bash

rm -rf ota
install -d ota/1/d ota/2/d ota/1/s ota/2/s

ls / > ota/1/s/same
ls / > ota/2/s/same

ls /bin > ota/1/d/diff
ls /usr/bin > ota/2/d/diff

ln -s s/same ota/1/link.same
ln -s s/same ota/2/link.same

ln -s abc ota/1/link.diff
ln -s def ota/2/link.diff

ln -s s/same ota/1/link.diff2
ln -s d/diff ota/2/link.diff2

ln -s more1 ota/1/link.diff3
ln -s more1 ota/2/link.diff3

ls / > ota/1/more1
ls / > ota/2/more2

mkdir ota/1/morefolder1
mkdir ota/2/morefolder2

./ota_make.sh ota/2 ota/1 ota/p
./ota_patch.sh ota/3 ota/1 ota/p

diff -r ota/2 ota/3

tree ota
```


当然，实际的差分升级过程要比这个复杂得多。比如需要进行升级前的check sum验证。等等。 
