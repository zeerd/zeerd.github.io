---
layout: post
title: 在Yocto环境中集成基于RPM发布的软件包
tag: [yocto,rpm]
---

bb文件可以参照如下的格式进行编写。
<!--break-->

```
LICENSE = "CLOSED"

SRC_URI= "file://${PN}-${PV}-r0.xx_yy.rpm;name=pkg;subdir=${PN}-${PV} \
          file://${PN}-dev-${PV}-r0.xx_yy.rpm;name=dev;subdir=${PN}-${PV} "

SRC_URI[pkg.md5sum] = "4115ff3b2d61a458b39d1d51dd3adc80"
SRC_URI[dev.md5sum] = "4bd26e0441686324afc332f8fd1dc2a0"

inherit bin_package

INSANE_SKIP_${PN} += "already-stripped"

do_install_append() {
    cp -r ${S}/* ${D}
}
```
