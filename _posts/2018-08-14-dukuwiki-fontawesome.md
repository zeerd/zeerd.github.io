---
layout: post
title: Add fontawesome into Dokuwiki
tag: [Dokuwiki,FontAwesome]
categories: [Website]
---

<!--break-->

1. 修改inc/template.php文件中的tpl_metaheaders函数。在函数结尾的适当位置加入如下内容：

   ```php
    $head['link'][] = array(
        'rel' => 'stylesheet',
        'href' => 'https://use.fontawesome.com/releases/v5.2.0/css/all.css',
        'integrity' => 'sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ',
        'crossorigin' => 'anonymous'
    );
   ```

2. 安装插件：https://www.dokuwiki.org/plugin:fontawesome

3. 按着插件页面最下面的提示进行使用即可。


