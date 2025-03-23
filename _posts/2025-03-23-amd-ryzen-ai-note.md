---
layout: post
title: 跟跑 Ryzen AI Software Getting Start 的一些记录
tags: [AMD, Ryzen]
categories: [AI]
---
<!--break-->


下面内容是我研究这些教材时自己琢磨出来的（也有AI告诉的），未必是对的。只是我这么改之后，能用了。

## quicktest.py


运行`python quicktest.py`失败，提示错误：

```bash
Traceback (most recent call last):
  File "C:\Program Files\RyzenAI\1.3.1\quicktest\quicktest.py", line 45, in <module>
    apu_type = get_apu_info()
  File "C:\Program Files\RyzenAI\1.3.1\quicktest\quicktest.py", line 16, in get_apu_info
    if 'PCI\\VEN_1022&DEV_1502&REV_00' in stdout.decode(): apu_type = 'PHX/HPT'
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb9 in position 14: invalid start byte
```

原因和解决办法：
脚本默认系统返回的设备信息列表是`UTF-8`的。但是中文版Windows返回的是`GBK`的。这个可以通过`chcp`命令来确认。

解决办法方法：

```python
    output = stdout.decode("gbk", errors="ignore")  # »ò cp936
    apu_type = ''
    if 'PCI\\VEN_1022&DEV_1502&REV_00' in output: apu_type = 'PHX/HPT'
    if 'PCI\\VEN_1022&DEV_17F0&REV_00' in output: apu_type = 'STX'
    if 'PCI\\VEN_1022&DEV_17F0&REV_10' in output: apu_type = 'STX'
    if 'PCI\\VEN_1022&DEV_17F0&REV_11' in output: apu_type = 'STX'
    if 'PCI\\VEN_1022&DEV_17F0&REV_20' in output: apu_type = 'KRK'
```

按上面内容修改脚本。

## 加速

运行`prepare_model_data.py`时需要下载一些模型文件。


由于各种原因，默认的网络可能网速不太理想。这时候可以借助一些代理服务器。

`Power Shell`中设置的方法是（直接在命令行敲）：

```
$env:HTTP_PROXY = "http://username:password@proxy_server:port"
$env:HTTPS_PROXY = "http://username:password@proxy_server:port"
```

可以用`ls Env:`检查设置是否成功。


## yolov8

[Yolov8 Python Implementation](https://github.com/amd/RyzenAI-SW/tree/main/tutorial/yolov8/yolov8_python)


弄了好半天也没能让 `Jupyter note` 找到 `onnxruntime`。决定先试验一下`python yolov8.py`。结果运行结束之后没有任何图片生成。

这是因为`yolov8.py`只是一个性能测试，根本没有将结果保存下来。

参考一下`yolov8.ipynb`，在每个`preds`后面添加`plot_images`的调用。

记得去`yolov8_utils.py`里面把`plot_images`最后面的`display(annotator.im)`删掉。因为命令行下没有`display`。


### Jupyter Notebook

```base
(base) PS E:\RyzenAI-SW\tutorial\yolov8\yolov8_python> conda create --name yolov8_env --clone ryzen-ai-1.3.1
(base) PS E:\RyzenAI-SW\tutorial\yolov8\yolov8_python> conda activate yolov8_env
(yolov8_env) PS E:\RyzenAI-SW\tutorial\yolov8\yolov8_python> conda install ipykernel -y
(yolov8_env) PS E:\RyzenAI-SW\tutorial\yolov8\yolov8_python> python -m ipykernel install --user --name yolov8_env --display-name yolov8
(yolov8_env) PS E:\RyzenAI-SW\tutorial\yolov8\yolov8_python> jupyter.exe notebook
```

注意，打开Jupyter Notebook之后，列出的kernel名字应该是`Python [conda env:yolov8_env]`。

如果`ipykernel`是在`base`环境创建的，名字里面只有`yolov8`。这种情况下，notebook里面找不到`ryzen-ai-1.3.1`中已经安装好的`onnxruntime`。

但是这样，安装`ipykernel`的时候，一些其他模块的版本会被调整。其实是不太好的。理论上应该有其他办法。
