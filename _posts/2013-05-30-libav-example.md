---
layout: post
title: 利用libav（ffmpeg）读取视频文件的信息
tag: [FFmpeg,libav]
---
最近在研究libav（ffmpeg），发现网上找到的例子版本太旧了。于是对这个代码进行了一些修改，使其适用于新版本的lib。

<!--break-->

同时，原版本中的frame存储成了ppm格式，实在少见，所以修改成了比较常用的jpeg。

基本上从头到尾都是抄来的，我只是进行了整合。原文见下面链接：

* http://dranger.com/ffmpeg/tutorial01.c
* http://blog.csdn.net/ajaxhe/article/details/7383800
* http://blog.sina.com.cn/s/blog_6dec72a30100mntz.html

顺便说一句，这个可以实现linux下的视频文件封面（video cover）预览功能。

```cpp
// tutorial01.c
// Code based on a tutorial by Martin Bohme (boehme@inb.uni-luebeckREMOVETHIS.de)
// Tested on Gentoo, CVS version 5/01/07 compiled with GCC 4.1.1

// A small sample program that shows how to use libavformat and libavcodec to
// read video from a file.
//
// Use
//
// gcc -o tutorial01 tutorial01.c -lavformat -lavcodec -lz -lswscale -lavutil -ljpeg
//
// to build (assuming libavformat and libavcodec are correctly installed
// your system).
//
// Run using
//
// tutorial01 myvideofile.mpg
//
// to write the first five frames from "myvideofile.mpg" to disk in PPM
// format.
//
// modifed by emneg-zeerd at 2013-05-30
// suit for the new version of libav and save the frame to one more common type to use
//
// REF:
// http://dranger.com/ffmpeg/tutorial01.c
// http://blog.csdn.net/ajaxhe/article/details/7383800
// http://blog.sina.com.cn/s/blog_6dec72a30100mntz.html

#include <stdio.h>

#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libswscale/swscale.h>
#include <jerror.h>
#include <jpeglib.h>


static int save_frame_as_jpeg(
    AVFrame *pFrameRGB,
    int width,
    int height,
    int framenum)
{
    char fname[512];
    struct jpeg_compress_struct cinfo;
    struct jpeg_error_mgr jerr;
    JSAMPROW row_pointer[1];
    int row_stride;
    uint8_t *buffer;
    FILE *fp = NULL;

    buffer = pFrameRGB->data[0];

    cinfo.err = jpeg_std_error(&jerr);
    jpeg_create_compress(&cinfo);

    sprintf(fname, "frames_%x.jpg", framenum);
    fp = fopen(fname, "wb");

    if (fp == NULL){
        return -1;
    }

    jpeg_stdio_dest(&cinfo, fp);

    cinfo.image_width = width;
    cinfo.image_height = height;
    cinfo.input_components = 3;
    cinfo.in_color_space = JCS_RGB;

    jpeg_set_defaults(&cinfo);
    jpeg_set_quality(&cinfo, 80, TRUE);

    jpeg_start_compress(&cinfo, TRUE);

    row_stride = width * 3;

    while (cinfo.next_scanline < height)
    {
        /* jpeg_write_scanlines expects an array of pointers to scanlines.
        * Here the array is only one element long, but you could pass
        * more than one scanline at a time if that's more convenient.
        */
        row_pointer[0] = &buffer[cinfo.next_scanline * row_stride];
        jpeg_write_scanlines(&cinfo, row_pointer, 1);
    }

    jpeg_finish_compress(&cinfo);
    fclose(fp);
    jpeg_destroy_compress(&cinfo);

    return 0;

}

int main (int argc, char *argv[])
{
    AVFormatContext    *pFormatCtx;
    int                i, videoStream;
    AVCodecContext     *pCodecCtx;
    AVCodec            *pCodec;
    AVFrame            *pFrame;
    AVFrame            *pFrameRGB;
    AVPacket           packet;
    int                frameFinished;
    int                numBytes;
    uint8_t            *buffer;

    // Register all formats and codecs
    av_register_all();
    // Open video file
    pFormatCtx = NULL;
    if(avformat_open_input(&pFormatCtx, argv[1], NULL, NULL)!=0){
        return -1;
    }

    // Retrieve stream information
    if(avformat_find_stream_info(pFormatCtx, NULL)<0){
        return -1;
    }

    // Dump information about file onto standard error
    av_dump_format(pFormatCtx, 0, argv[1], 0);

    // Find the first video stream
    videoStream=-1;
    for(i=0; i<pFormatCtx->nb_streams; i++){
        if(pFormatCtx->streams[i]->codec->codec_type==AVMEDIA_TYPE_VIDEO){
            videoStream=i;
            break;
        }
    }

    if(videoStream==-1){
        return -1;
    }


    // Get a pointer to the codec context for the video stream
    pCodecCtx=pFormatCtx->streams[videoStream]->codec;


    // Find the decoder for the video stream
    pCodec=avcodec_find_decoder(pCodecCtx->codec_id);
    if(pCodec==NULL) {
        return -1; // Codec not found
    }

    // Open codec
    if(avcodec_open2(pCodecCtx, pCodec, NULL)<0){
        return -1; //
    }

    // Allocate video frame
    pFrame=avcodec_alloc_frame();
    if(pFrame==NULL){
        return -1; //
    }

    // Allocate an AVFrame structure
    pFrameRGB=avcodec_alloc_frame();
    if(pFrameRGB==NULL){
        return -1; //
    }

    // Determine required buffer size and allocate buffer
    numBytes=avpicture_get_size(
                AV_PIX_FMT_RGB24,
                pCodecCtx->width,
                pCodecCtx->height);
    buffer=(uint8_t *)av_malloc(numBytes*sizeof(uint8_t));
    if(buffer==NULL){
        return -1; //
    }

    // Assign appropriate parts of buffer to image planes in pFrameRGB
    // Note that pFrameRGB is an AVFrame, but AVFrame is a superset
    // of AVPicture
    avpicture_fill(
        (AVPicture *)pFrameRGB,
        buffer,
        AV_PIX_FMT_RGB24,
        pCodecCtx->width,
        pCodecCtx->height);


    // Read frames and save first five frames to disk
    i=1;

    while(av_read_frame(pFormatCtx, &packet)>=0) {
        // Is this a packet from the video stream?
        if(packet.stream_index==videoStream) {
            // Decode video frame
            int err = avcodec_decode_video2(
                            pCodecCtx,
                            pFrame,
                            &frameFinished,
                            &packet);

            // Did we get a video frame?
            if(frameFinished) {

                // Convert the image from its native format to RGB
                struct SwsContext *img_convert_ctx;

                img_convert_ctx = sws_getContext(
                                    pCodecCtx->width,
                                    pCodecCtx->height,
                                    pCodecCtx->pix_fmt,
                                    pCodecCtx->width,
                                    pCodecCtx->height,
                                    AV_PIX_FMT_RGB24,
                                    SWS_BICUBIC,
                                    NULL,
                                    NULL,
                                    NULL);
                if(img_convert_ctx == NULL){
                    return -1;
                }

                sws_scale(
                    img_convert_ctx,
                    (const uint8_t * const*)pFrame->data,
                    pFrame->linesize,
                    0,
                    pCodecCtx->height,
                    pFrameRGB->data,
                    pFrameRGB->linesize);

                // Save the frame to disk
                if(++i<=5){
                    save_frame_as_jpeg(
                        pFrameRGB,
                        pCodecCtx->width,
                        pCodecCtx->height,
                        i);
                }
                else{
                    break;
                }
            }
        }

        // Free the packet that was allocated by av_read_frame
        av_free_packet(&packet);
    }


    // Free the RGB image
    av_free(buffer);
    av_free(pFrameRGB);


    // Free the YUV frame
    av_free(pFrame);


    // Close the codec
    avcodec_close(pCodecCtx);


    // Close the video file
    avformat_close_input(&pFormatCtx);

    return 0;
}
```
