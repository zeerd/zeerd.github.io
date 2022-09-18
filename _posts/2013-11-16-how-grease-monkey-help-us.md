---
layout: post
title: 我们可以用油猴（GreaseMonkey）做什么
tags: [GreaseMonkey,Script]
categories: [Program]
---
记得第一次接触油猴大概是在11年。那时候玩一个现在已经记不起名字的网页文字游戏，新手指南第一件事就是安装油猴，通过脚本汉化游戏UI。
<!--break-->

后来很长一段时间没有和油猴打过交道了，直到最近，玩一个新的网页文字游戏——[idle](http://idle.marrla.com/)——据说是只有一个人独立开发的。而独立开发的问题就是作者要把很多精力放到平衡性上，削弱这里、加强那里，唯一没有时间做的就是优化UI。所以，我自己写了一个基于chrome插件的装备筛选程序。而这个时候，一个人站出来正告我，“你应该用油猴！”

油猴，一个很久远的回忆，甚至已经不太记得那是什么。用google来baidu一下，然先油猴脚本不需要从头学习，直接使用`javascript`就可以了，虽然我的js也仅仅是入门级别。

那么接下来的事情就很简单了。抄例子，改脚本。

首先，我们可以用油猴给页面加控件。

加控件就要确定位置。最简单的办法，直接加到页面最后面去。

```javascript
document.body.appendChild( document.createElement( 'div'));
document.body.lastChild.innerHTML = 'now you see me!<br/>';
```

上面的脚本的作用是在页面的最后面创建一个`div`，然后把单引号内的文字放入到这个`div`中。

当然，这么做的话，页面整体效果一定很丑，那么就可能需要精确定位.
这时候就需要分析源页面中的各种元素并且看看自己的运气了。也许源页面的作者恰好在某个你喜欢的位置放置了一个有id的控件。
比如你找到了一个`<div id="ah_a_id">`，那么接下来你可以选择把自己的东西加到这个`ah_a_id`的前面。

```javascript
var pos = document.getElementById('ah_a_id');
var new_div = document.createElement("div");
if(pos ){
	new_div .innerHTML = 'now you see me!<br/>';
	pos .parentNode.insertBefore(new_div, pos);
}
```

或者，你更喜欢把它放在`ah_a_id`的后面。

```javascript
var pos = document.getElementById('ah_a_id');
var new_div = document.createElement("div");
if(pos ){
	new_div .innerHTML = 'now you see me!<br/>';
	pos .parentNode.insertBefore(new_div, pos.nextSibling);
}
```

其次，就是我最喜欢的事情了。你可以给当前页面加代码。

你可能想要一个新的按钮，然后按下他的时候表现一下自己的存在感。

```javascript
document.body.appendChild( document.createElement( 'div'));
document.body.lastChild.innerHTML = '<a href=\"javascript:you_click_me();\">click</a>';
document.body.appendChild( document.createElement( 'script'));
document.body.lastChild.innerHTML =
	'\
	function you_click_me() { \n\
		alert("catch you!");\n\
	}\n\
	';
```

最后，虽然看起来没什么必要，但我还是要留在这里：
<http://userscripts.org/users/538651>
