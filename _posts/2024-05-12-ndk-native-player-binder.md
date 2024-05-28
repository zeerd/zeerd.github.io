---
layout: post
title: 基于 Binder 让 MediaCodec 在独立的 Native 服务进程播放视频并描画到 JAVA 层提供的窗口上
tag: [NDK,Android,MediaCodec,Binder]
categories: [Program]
---

<!--break-->

让我们在[前文](../ndk-native-player)的基础上继续讨论。


# 通过 Binder 发送 窗口句柄 和 URI

```cpp
JNIEXPORT void JNICALL Java_com_zeerd_ndk_NativePlayer_createPlayer(
        JNIEnv* env, jclass clazz, jobject surface, jstring uri)
{
    const char *curi = env->GetStringUTFChars(uri, NULL);
    ANativeWindow *window = ANativeWindow_fromSurface(env, surf);

    sp<Surface> surface = static_cast<Surface *>(window);
    sp<IGraphicBufferProducer> producer = surface->getIGraphicBufferProducer();

    Parcel data;
    data.writeStrongBinder(IInterface::asBinder(producer));
    data.writeCString(curi);

    sp<IServiceManager> sm = defaultServiceManager();
    sp<IBinder> binder = sm->getService(String16(SERVICE_NAME));
    binder->transact(0, data, nullptr, 0);
}
```

# 通过 Binder 接收 窗口句柄 和 URI

```cpp
#include <binder/BinderService.h>
#include <binder/Parcel.h>
#include <gui/Surface.h>

using namespace android;

class NativeService : public BBinder {
   public:
    virtual ~NativeService() {}
    static const char* getServiceName() { return SERVICE_NAME; }

    virtual status_t onTransact(uint32_t code, const Parcel& data,
                                Parcel* reply, uint32_t flags = 0)
    {
        switch (code) {
            case 0: {
                sp<IGraphicBufferProducer> producer =
                    interface_cast<IGraphicBufferProducer>(
                        data.readStrongBinder());
                sp<Surface> surf = new android::Surface(producer, true);
                ANativeWindow *window = surf.get();
                const char* curi = data.readCString();
                // playWith(window, curi);
                return NO_ERROR;
            }
            default:
                return BBinder::onTransact(code, data, reply, flags);
        }
    }
};

int main(int argc, char** argv)
{
    sp<IServiceManager> sm = defaultServiceManager();
    sm->addService(String16(NativeService::getServiceName()),
                new NativeService());
    IPCThreadState::self()->joinThreadPool();
    return 0;
}
```
