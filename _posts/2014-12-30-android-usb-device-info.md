---
layout: post
title: 根据/dev/bus/usb在不打开设备的情况下获取USB信息
tags: [Android,Device]
---
在Android中，我们通常在上层只能获取到类似/dev/bus/usb/001/002这样的设备名称。<br>通过这个名称，可以打开设备并且进行相关的操作。<br><br>但是，有时候我们可能因为某些原因无法打开设备。那么，下面的方法可以参考用来获取一些设备信息。<br>
<!--break-->

```c
/* 
 * Refs : ./system/core/fastboot/usb_linux.c:164~181 @ Android
 * The following comments were copied from this file:
 * 
 * We need to get a path that represents a particular port on a particular
 * hub.  We are passed an fd that was obtained by opening an entry under
 * /dev/bus/usb.  Unfortunately, the names of those entries change each
 * time devices are plugged and unplugged.  So how to get a repeatable
 * path?  udevadm provided the inspiration.  We can get the major and
 * minor of the device file, read the symlink that can be found here:
 *   /sys/dev/char/<major>:<minor>
 * and then use the last element of that path.  As a concrete example, I
 * have an Android device at /dev/bus/usb/001/027 so working with bash:
 *   $ ls -l /dev/bus/usb/001/027
 *   crw-rw-r-- 1 root plugdev 189, 26 Apr  9 11:03 /dev/bus/usb/001/027
 *   $ ls -l /sys/dev/char/189:26
 *   lrwxrwxrwx 1 root root 0 Apr  9 11:03 /sys/dev/char/189:26 ->
 *           ../../devices/pci0000:00/0000:00:1a.7/usb1/1-4/1-4.2/1-4.2.3
 * So our device_path would be 1-4.2.3 which says my device is connected
 * to port 3 of a hub on port 2 of a hub on port 4 of bus 1 (per
 * http://www.linux-usb.org/FAQ.html).
 * */


#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <linux/kdev_t.h>

typedef struct {
	char path[1024];
	char product[1024];
	char vendor[1024];
	char serial[1024];
}info_t;

static int readInfo(const char* from, char* info){
	FILE *fp = fopen(from, "r");
	if(fp != NULL){
		fscanf(fp, "%s", info);
		fclose(fp);
		return 0;
	}
	return -1;
}

int readInfos(const char* from, info_t* info){

    struct stat s;
    if(lstat(from, &s) < 0) {
		printf("Usage:\n\t%s <block path or char path>\n\n", argv[0]);
        return -1;
    }
    
    if(((s.st_mode & S_IFMT) == S_IFBLK) 
    || ((s.st_mode & S_IFMT) == S_IFCHR)){
		sprintf(info->path, 
			"/sys/dev/char/%d:%d", 
			(int) MAJOR(s.st_rdev), (int) MINOR(s.st_rdev));
		char readFromFile[1024];
		sprintf(readFromFile, "%s/idProduct", info->path);
		readInfo(readFromFile, info->product);
		sprintf(readFromFile, "%s/idVendor", info->path);
		readInfo(readFromFile, info->vendor);
		sprintf(readFromFile, "%s/serial", info->path);
		readInfo(readFromFile, info->serial);
	}
	return 0;
}
    
int main(int argc, char **argv)
{
	if(argc != 2){
		printf("Usage:\n\t%s <path>\n\n", argv[0]);
	} else {
		info_t info;
		if(readInfos(argv[1], &info) < 0){
			printf("parameter error!\n");
		} else {
			printf("path:%s\nidProduct:%s\nidVendor:%s\nSerial:%s\n",
				argv[1], info.product, info.vendor, info.serial);
		}
	}
	
	return 0;
}
```
                                      
