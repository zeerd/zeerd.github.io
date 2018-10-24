---
layout: post
title: 修改github中已经提交的pull request的patch log（patch title）
tag: [GitHub,Git]
---
有时候，我们向一些开源项目提交某个Patch，一切看起来都不错，但是，可能会略了一个问题：对方对于Commit Log的格式可能会有一些特殊的[要求](https://github.com/GENIVI/wayland-ivi-extension/pull/3)。比如会有一些前缀。
<!--break-->
这个时候就需要我们可以拥有一些手段对这个git log进行修改。

github给出了一个[方法](https://help.github.com/articles/changing-a-commit-message/)，但是不知道是git版本更新还是其他原因导致，这里面存在一个问题：网页中提到，需要执行命令“ ```push --force```”，并给出一个例子：

```
git push --force example-branch
```

而实际上，这个例子是错误的，执行这条命令时不需要“example-branch”这个参数。

下面是我修改git log的全过程：


 + ```git clone https://github.com/zeerd/wayland-ivi-extension.git```
 + ```cd wayland-ivi-extension/```
 + ```git checkout patch-1```
 + ```git commit --amend```
 + ```git push --force```
