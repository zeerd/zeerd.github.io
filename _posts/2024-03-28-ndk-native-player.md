---
layout: post
title: 基于 NDK 的 MediaCodec 播放视频并描画到 JAVA 层提供的窗口上
tag: [NDK,Android,MediaCodec]
categories: [Program]
---

<!--break-->

# 通过 JNI 从 JAVA 层获取 Surface

```c
JNIEXPORT void JNICALL Java_com_zeerd_ndk_NativePlayer_createPlayer(
        JNIEnv* env, jclass clazz, jobject surface)
{
    window = ANativeWindow_fromSurface(env, surface);
    return;
}
```

# 打开 MP4 文件，并找到视频流。

```c
const char* videoPath = "/sdcard/Download/video.mp4";
int fd = open(videoPath, O_RDONLY);
AMediaExtractor *ex = AMediaExtractor_new();
AMediaExtractor_setDataSourceFd(ex, fd, 0, LONG_MAX);
close(fd);

AMediaCodec *codec;
int i, numTracks = AMediaExtractor_getTrackCount(ex);
for (i = 0; i < numTracks && codec == NULL; i++) {
    const char *mime;
    AMediaFormat *format = AMediaExtractor_getTrackFormat(ex, i);
    AMediaFormat_getString(format, AMEDIAFORMAT_KEY_MIME, &mime);
    if (!strncmp(mime, "video/", 6)) {
        AMediaExtractor_selectTrack(ex, i);
        codec = AMediaCodec_createDecoderByType(mime);
        AMediaCodec_configure(codec, format, window, NULL, 0);
    }
    AMediaFormat_delete(format);
}
AMediaCodec_start(codec);
```

注意：不要使用`AMediaExtractor_setDataSource()`。除非你打算播放流媒体。
这个接口会尝试开启HTTP服务（并失败），看起来好像仅支持在线的流媒体。

# 读取并描画每一帧

启动一个独立的线程，循环调用下列处理逻辑。
直到`sawInputEOS`和`sawOutputEOS`变成`true`。

```c
ssize_t idxIn = -1;
if (!sawInputEOS) {
    idxIn = AMediaCodec_dequeueInputBuffer(codec, 2000);
    if (idxIn >= 0) {
        size_t bufSize;
        uint8_t* buf = AMediaCodec_getInputBuffer(codec, idxIn, &bufSize);
        ssize_t size = AMediaExtractor_readSampleData(ex, buf, bufSize);
        if (size < 0) {
            size = 0;
            sawInputEOS = true;
        }
        int64_t ptsUS = AMediaExtractor_getSampleTime(ex);
        AMediaCodec_queueInputBuffer(codec, idxIn, 0, size, ptsUS,
                sawInputEOS ? AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM : 0);
        AMediaExtractor_advance(ex);
    }
}

if (!sawOutputEOS) {
    AMediaCodecBufferInfo info;
    ssize_t idx = AMediaCodec_dequeueOutputBuffer(codec, &info, 0);
    if (idx >= 0) {
        if (info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM) {
            sawOutputEOS = true;
        }
        AMediaCodec_releaseOutputBuffer(codec, idx, info.size != 0);
    }
}
```

# 销毁

```c
AMediaCodec_stop(codec);
AMediaCodec_delete(codec);
AMediaExtractor_delete(ex);
ANativeWindow_release(window);
```

# JAVA 代码和准备窗口

```java
package com.zeerd.ndk;

import android.app.Activity;
import android.os.Bundle;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;

public class NativePlayer extends Activity {
    static final String TAG = "NativePlayer";

    SurfaceView mSurfaceView;
    SurfaceHolder mSurfaceHolder;

    @Override
    public void onCreate(Bundle icicle) {
        super.onCreate(icicle);
        setContentView(R.layout.main);

        mSurfaceView = (SurfaceView) findViewById(R.id.surfaceview);
        mSurfaceHolder = mSurfaceView.getHolder();

        mSurfaceHolder.addCallback(new SurfaceHolder.Callback() {
            @Override
            public void surfaceChanged(SurfaceHolder holder, int format, 
            	                       int width, int height) {
            }

            @Override
            public void surfaceCreated(SurfaceHolder holder) {
                createPlayer(holder.getSurface());
            }

            @Override
            public void surfaceDestroyed(SurfaceHolder holder) {
            }
        });
    }

    @Override
    protected void onDestroy()
    {
        destroyPlayer();
        super.onDestroy();
    }

    public static native void createPlayer(Surface surface);
    public static native void destroyPlayer();

    static {
         System.loadLibrary("jni_ndkplayer");
    }
}
```

# 对比：直接使用Java接口播放

```java
public class NativePlayer extends Activity {
    static final String TAG = "NativePlayer";

    SurfaceView mSurfaceView;
    SurfaceHolder mSurfaceHolder;

    MediaPlayer mediaPlayer;

    @Override
    public void onCreate(Bundle icicle) {
        super.onCreate(icicle);
        setContentView(R.layout.main);

        mSurfaceView = (SurfaceView) findViewById(R.id.surfaceview);
        mSurfaceHolder = mSurfaceView.getHolder();

        mSurfaceHolder.addCallback(new SurfaceHolder.Callback() {
            @Override
            public void surfaceChanged(SurfaceHolder holder, 
                                       int format, int width, int height) {
            }
            @Override
            public void surfaceCreated(SurfaceHolder holder) {
                Surface surface = holder.getSurface();
                mediaPlayer.setSurface(surface);
                mediaPlayer.prepareAsync();
            }
            @Override
            public void surfaceDestroyed(SurfaceHolder holder) {
            }
        });

        mediaPlayer = new MediaPlayer();
        try {
            mediaPlayer.setDataSource("/sdcard/Download/video.mp4");
        } catch (IOException e) {
            e.printStackTrace();
        }
        mediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
            @Override
            public void onPrepared(MediaPlayer mp) {
                mp.start();
            }
        });
    }

    @Override
    protected void onDestroy()
    {
        super.onDestroy();
    }
}
```
