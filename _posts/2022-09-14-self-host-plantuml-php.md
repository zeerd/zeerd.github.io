---
layout: post
title: 自搭建的Plantuml描画网页服务
tags: [Plantuml,PHP]
---

Self-Hosted Plantuml Web Server.

一个简易的、可以帮助Github Pages显示Plantuml图片的转换网站。


<!--break-->

## 核心代码

```php
<?php

// plantuml.php?uml=a+->+b+%3A+c

function _convert($data) {

    $in = $_SERVER['DOCUMENT_ROOT']
        . '/cache/'
        . hash('md5', $_SERVER["REQUEST_URI"]);
    $in = str_replace("?", '-', $in);
    $in = str_replace("*", '-', $in);

    if(false !== ($f = @fopen($in, 'w'))) {
      fwrite($f, "@startuml\n");
      fwrite($f, urldecode($data));
      fwrite($f, "\n@enduml\n");
      fclose($f);
    }
    $command = '/usr/bin/java';
    $command .= ' -Djava.awt.headless=true';
    $command .= ' -Dfile.encoding=UTF-8';
    $command .= ' -jar /home/wwwroot/www.zeerd.com/plantuml-1.2022.7.jar';
    $command .= ' -charset UTF-8';
    $command .= ' -encodeurl';
    $command .= ' ' . escapeshellarg($in);
    $command .= ' 2>&1';

    $encoded = exec($command, $output, $return_value);

    $remote_url = 'https://www.plantuml.com/plantuml/';
    $base_url = preg_replace('/(.+?)\/$/', '$1', $remote_url);

    $url = "$base_url/svg/".$encoded;

    $ch = curl_init($url);
    curl_exec($ch);
    curl_close($ch);
}

_convert($_REQUEST['uml']);

?>

```

## 使用

添加javascript脚本：

```javascript
setInterval(() => {
    const prefix = "https://www.zeerd.com/plantuml.php?uml=";
    var elements = document.getElementsByClassName('language-plantuml');
    for (var i=0, len=elements.length|0; i<len; i=i+1|0) {
        encoded = encodeURI(prefix + "@startuml\n" + elements[i].innerHTML 
        	                       + "\n@enduml");
        // elements[i].innerHTML = "<img alt='DOT sample with Gravizo' src='" 
        //                       + encoded + "'>";
        elements[i].innerHTML = "<object "
                              + "type='image/svg+xml' "
                              + "style='width:100%;height:100%' "
                              + "data='" + encoded + "'>"
                              + "</object>";
        elements[i].className = "plantuml";
        elements[i].outerHTML = elements[i].outerHTML.replace(/code/g,"div");
    }
}, 1000)
```

在md中按着如下格式编写：

<pre>
```plantuml
a -> b : c
```
</pre>
