---
layout: post
title: 自搭建的Plantuml描画网页服务
tags: [PlantUML,PHP]
---

Self-Hosted Plantuml Web Server.

自己搭建，一个简易的、可以帮助Github Pages显示Plantuml图片的转换网站。

<!--break-->

## 核心代码

```php
<?php

// uml.php?a=a+->+b+%3A+c

$java = '/usr/bin/java';
$plantuml = '/path/to/plantuml.jar';
$remote_url = 'https://www.plantuml.com/plantuml/';

$in = $_SERVER['DOCUMENT_ROOT'].'/cache/'.hash('md5', $_SERVER["REQUEST_URI"]);

if(false !== ($f = @fopen($in, 'w'))) {
  fwrite($f, "@startuml\n");
  fwrite($f, urldecode($_REQUEST['a']));
  fwrite($f, "\n@enduml\n");
  fclose($f);
}

$command  = $java;
$command .= ' -Djava.awt.headless=true';
$command .= ' -Dfile.encoding=UTF-8';
$command .= ' -jar ' . $plantuml;
$command .= ' -charset UTF-8';
$command .= ' -encodeurl';
$command .= ' ' . escapeshellarg($in);
$command .= ' 2>&1';
$encoded = exec($command, $output, $return_value);

$base_url = preg_replace('/(.+?)\/$/', '$1', $remote_url);
$url = "$base_url/svg/$encoded";

header('Content-Type: image/svg+xml;');
header('Expires: '
     . gmdate('D, d M Y H:i:s', time() + max($conf['cachetime'], 3600))
     . ' GMT');
header('Cache-Control: public, proxy-revalidate, no-transform, max-age='
     . max($conf['cachetime'], 3600));
header('Pragma: public');

$ch = curl_init($url);
curl_exec($ch);
curl_close($ch);

?>

```

## 使用

添加 javascript 脚本：

```javascript
setInterval(() => {
    const prefix = "https://www.zeerd.com/uml.php?a=";
    var elements = document.getElementsByClassName('language-plantuml');
    for (var i=0, len=elements.length|0; i<len; i=i+1|0) {
        encoded = encodeURI(prefix + elements[i].innerHTML);
        encoded = encoded.replace(/#/g, "%23");
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

在 md 中按着如下格式编写：

<pre>
```plantuml
a -> b : c
```
</pre>


效果如下：

```plantuml
a -> b : c
```

## 后记

在实际使用中，我发现，nginx 搭建的网站好像在 HTTPS 方面存在某些限制， URL 存在某个长度上限。
当然，也可能是 SSL 相关的问题。总之，同样的配置， HTTP 可以正常使用。 HTTPS 莫名其妙不好用。

因此，如果找不到解决方案的话，还是需要关注一下 PlantUML 内容的长度。
