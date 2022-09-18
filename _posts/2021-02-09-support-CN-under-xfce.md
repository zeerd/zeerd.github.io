---
layout: post
title: Support Chinese under Ubuntu XFCE
tag: [Ubuntu,XFCE]
categories: [OperatingSystem]
---

<!--break-->

# Input Method and Font

```bash
apt install ibus-sunpinyin
apt install ttf-mscorefonts-installer
apt install fonts-wqy-zenhei
ibus-daemon -d
```

[Change setting by command-line](https://unix.stackexchange.com/a/236817), if needed.

[Never use ibus-pinyin, it's bugged](https://blog.zeerd.com/Double-click-text-disappeared).

# Xfce-Terminal

```
Edit -> Preferences -> Advance -> Encoding -> UTF-8
```

# vim

Create or Modify the `~/.vimrc` :

```
set encoding=utf-8
set fileencoding=utf-8
```

# Reference

[How to view UTF-8 Characters in VIM or Gvim](https://stackoverflow.com/questions/5166652/how-to-view-utf-8-characters-in-vim-or-gvim)

