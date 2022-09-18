---
layout: post
title: 使用HTML5实现文字渐出
tag: [HTML5]
categories: [Website]
---

其实没什么技术含量，就是计算好位置，然后用计时器一个一个字的显示出来。

<!--break-->
而对于单个文字的渐出效果，则就是把一个字用不同的颜色反复的画几遍。

这个东西，对于专业搞网页的人来说，可能小菜一碟。即使对于我这样的业余选手来说，也就是是不是向这个方向去想了而已。

废话少说，上代码：


```php
<html>
<head>
    <title>About zeerd</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
</head>

<body>

<canvas id="csser-com-Canvas" width="800"  height="600" >
   <!-- 向后兼容的内容 -->
  <font color=blue>您的浏览器不支持 &lt;canvas&gt;标签，请使用 Chrome 或者 FireFox 等支持HTML5的浏览器访问本页面</font>
</canvas>

<script>

var Size = 50;
var StartX = 700;
var StartY = 100;

var canvas = document.getElementById("csser-com-Canvas");
var c = canvas.getContext("2d");
var text='天长地久天地所以能长且久者以其不自生故能长生是以圣人后其身而身先外其身而身存非以其无私耶故能成其私';
var colors=new Array(
  'rgb(255, 255, 255)',
  'rgb(244, 244, 244)',
  'rgb(233, 233, 233)',
  'rgb(222, 222, 222)',
  'rgb(211, 211, 211)',
  'rgb(200, 200, 200)'
);

var i=0;
var j=0;
var k=0;
var y = StartY;
var x = StartX;

c.font = 'bold 32px sans-serif'

function draw()
{
  if(i < 7)
  {
    c.fillStyle = colors[k];

    var start = i*7+j;
    var sub = text.substring(start,start+1);
    c.fillText(sub, x, y);

    k++;
    if (k >= 6)
    {
      y += Size;

      k=0;
      j++;

      if(j >= 7)
      {
        x -= Size;
        y = StartY;

        i++;
        j=0;
      }
    }
  }
  else
  {
    window.clearInterval(window.canvasTimer)
  }
};

window.canvasTimer = setInterval(draw, 80);

</script>

</body>
</html>
```