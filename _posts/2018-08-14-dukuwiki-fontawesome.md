---
layout: post
title: Add fontawesome into Dokuwiki
tag: [Dokuwiki,FontAwesome]
---

<!--break-->

1. 修改inc/template.php文件中的tpl_metaheaders函数。在函数结尾的适当位置加入如下内容：

   ```php
   $head['link'][] = array(
       'rel' => 'stylesheet',
       'href' => 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
   );
   ```

2. 安装插件：https://www.dokuwiki.org/plugin:fontawesome

3. 按着插件页面最下面的提示进行使用即可。


