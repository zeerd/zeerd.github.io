---
layout: post
title: RAMSES 编译依赖排查
tag: [GENIVI,RAMSES,Graphic]
categories: [Linux]
---

<!--break-->

拿到RAMSES的源码进行编译，一切都很顺利。cmake和make都成功了。结果，上到调试板之后，发现找不到demo程序。这才发现，虽然看起来编译很顺利，其实很多东西都没有参与编译。



RAMSES的编译系统会尽可能跳过所有出错的地方，而不是明显的提示并停止。所以，发现缺少了东西，只能自己去逐条排查。



查看demo程序的CMakeLists.txt文件，例如ramses-text-demo-shadow的。发现它调用了一个函数，MODULE_WITH_SHARED_LIBRARY。在工程中搜索，可以发现这个函数定义在cmake/ramses/rendererModulePerConfig.cmake 中。



查看这个函数，发现里面有一步是判断${RAMSES_PLATFORM_SHLIB_NAME}是否存在。查看renderer/Platform目录，可以看到一系列Platform开头的文件夹。



这个时候，回过头来看cmake的结果，里面有如下一段：

```
-- + Window_Wayland (STATIC_LIBRARY)
-- - Context_WGL [missing Window_Windows;missing OpenGL;missing WGL]
-- + Context_EGL (STATIC_LIBRARY)
-- - Device_GL [missing OpenGL]
-- + WindowEventsPollingManager_Wayland (STATIC_LIBRARY)
-- - TextureUploadingAdapter_Wayland [missing Device_GL]
-- + EmbeddedCompositor_Dummy (STATIC_LIBRARY)
-- - EmbeddedCompositor_Wayland [missing TextureUploadingAdapter_Wayland]
-- + Logger_Wayland (STATIC_LIBRARY)
-- + Logger_Wayland_Test (TEST)
-- + Window_Wayland_Test (STATIC_LIBRARY)
-- + Window_Wayland_IVI (STATIC_LIBRARY)
-- + Window_Wayland_IVI_Test (TEST)
-- - Window_Wayland_Shell_Test [missing Window_Wayland_Shell]
-- - Window_Android [missing AndroidSDK]
-- - Surface_Windows_WGL [missing Window_Windows;missing Context_WGL]
-- - Surface_X11_EGL [missing Window_X11]
-- + Surface_Wayland_EGL (STATIC_LIBRARY)
-- + Surface_EGL_Offscreen (STATIC_LIBRARY)
-- - Surface_Android_EGL [missing Window_Android]
-- + PlatformFactory_Wayland_EGL (STATIC_LIBRARY)
-- - PlatformFactory_Wayland_IVI_EGL [missing EmbeddedCompositor_Wayland;missing TextureUploadingAdapter_Wayland]
-- - PlatformFactory_Wayland_Shell_EGL [missing Window_Wayland_Shell]
-- - platform-windows-wgl-4-2-core [missing Surface_Windows_WGL;missing Device_GL]
-- - platform-windows-wgl-4-5 [missing Surface_Windows_WGL;missing Device_GL]
-- - platform-windows-wgl-es-3-0 [missing Surface_Windows_WGL;missing Device_GL]
-- - platform-wayland-ivi-egl-es-3-0 [missing PlatformFactory_Wayland_IVI_EGL;missing Device_GL]
-- - EmbeddedCompositor_Wayland_Test [missing EmbeddedCompositor_Wayland;missing platform-wayland-ivi-egl-es-3-0]
-- - platform-wayland-shell-egl-es-3-0 [missing PlatformFactory_Wayland_Shell_EGL;missing Device_GL]
-- - platform-x11-egl-es-3-0 [missing Surface_X11_EGL;missing Device_GL]
-- - platform-android-egl-es-3-0 [missing Surface_Android_EGL;missing Device_GL]
-- + DisplayManager (STATIC_LIBRARY)
-- + DisplayManagerTest (TEST)
```

从里面可以看到platform-wayland-ivi-egl-es-3-0其实失败了，根据提示，是缺少了PlatformFactory_Wayland_IVI_EGL和Device_GL。

根据这个提示，继续向上找，最终发现是编译Device_GL时却少了OpenGL。



找到Device_GL目录下的CMakeLists.txt，里面通过下面语句查找OpenGL：

```
FIND_PACKAGE(OpenGL)
```



于是，转去翻看cmake/modules目录，果然找到了FindOpenGL.cmake。

打开查看，可以知道，RAMSES查找OpenGL的方式是直接去系统中寻找gl3.h这个头文件和libGLESv2.so这个苦文件。如果能够找到，就认为OpenGL是就绪的。



到此，问题好到了。我的编译环境中没有ES3.0的头文件。重新编译安装Mesa，问题解决了。
