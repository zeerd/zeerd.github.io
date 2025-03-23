---
layout: post
title: WSL删除文件后磁盘空间释放方法
tags: [WSL2]
categories: [Windows]
---
<!--break-->

在 WSL 中删除大量文件后，系统占用的磁盘空间可能不会立即释放。以下是减少真实系统占用的步骤：

## 压缩 WSL 虚拟硬盘

WSL 使用虚拟硬盘存储文件，删除文件后空间不会自动释放，需手动压缩。

### 步骤：

1. **关闭 WSL 实例**：
   ```bash
   wsl --shutdown
   ```

2. **优化虚拟硬盘**：
   - 打开 PowerShell 或命令提示符，执行以下命令：
     ```bash
     diskpart
     ```
   - 在 `diskpart` 中运行：
     ```bash
     select vdisk file="C:\Users\<YourUsername>\AppData\Local\Packages\<DistroPackage>\LocalState\ext4.vhdx"
     attach vdisk readonly
     compact vdisk
     detach vdisk
     exit
     ```
     将路径替换为你的 WSL 发行版的实际路径。
