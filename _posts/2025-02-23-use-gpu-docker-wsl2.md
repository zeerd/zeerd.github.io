---
layout: post
title: 在 Windows 系统的 WSL2 中使用 docker 访问显卡
tags: [WSL2，Docker]
categories: [AI]
---
<!--break-->

关键点就是运行`docker`时需要额外添加几个参数：

```bash
docker run --rm  --runtime=nvidia --gpus all ubuntu nvidia-smi
```

这条命令用于在 `Docker` 容器中运行 `NVIDIA GPU` 相关的操作。以下是各参数的含义：

1. **`docker run`**:
   - 这是 Docker 命令，用于创建并启动一个新容器。

2. **`--rm`**:
   - 容器停止后自动删除。适用于临时任务，避免容器残留。

3. **`--runtime=nvidia`**:
   - 指定使用 NVIDIA 容器运行时，以便容器访问 GPU 资源。

4. **`--gpus all`**:
   - 允许容器使用所有可用的 GPU。也可以指定特定 GPU，如 `--gpus 2` 或 `--gpus "device=0,1"`。

5. **`ubuntu`**:
   - 使用的 Docker 镜像名称，这里是一个 Ubuntu 镜像。

6. **`nvidia-smi`**:
   - 容器启动后执行的命令，用于显示 GPU 状态和相关信息。


注意：`WSL`中使用的显卡驱动其实是在`Windows`中已经安装好了的。虽然不知道原理，但是在`Windows`上升级显卡驱动就会自动更新`WSL`里面的`Linux`驱动。
