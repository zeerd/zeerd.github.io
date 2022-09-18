---
layout: post
title: Nginx show codes directly with highlight
tags: [Nginx,Highlight]
categories: [Website]
---
<!--break-->

Reference the [answer](https://stackoverflow.com/a/41532293/2838940) from stackoverflow.

**I copied the whole answer of [Ivan Tsirulev](https://stackoverflow.com/users/4375862/ivan-tsirulev) here, in case some day I could not visit this website again.**

**If this broke any license, please let me know. I will delete it and change a way to keep this.**


> As was already pointed out, Nginx is not quite suitable for generating HTML documents by itself. Usually this is a job for a server-side processing language like PHP or Perl. However, there are several ways of solving the problem solely with Nginx.
>
> The first obvious choice would be to use a server-side processing language from within Nginx. There are at least three optional modules for three different languages (Perl, Lua and a dialect of Javascript) that could be used for that.
>
> The problem with this approach is that these modules are rarely available by default, and in many cases you will have to build Nginx manually to enable any of them. Sometimes it can be painful, because as soon as you get your own custom build of Nginx, you will have to support and upgrade it yourself.
>
> There is, however, another option, which involves [SSI](http://nginx.org/en/docs/http/ngx_http_ssi_module.html). It might not be the prettiest solution but it will work. And unlike above-mentioned modules, the SSI support comes with almost every distribution of Nginx. My bet is, your Nginx can do SSI out of the box, without having to compile anything.
>
> So, the configuration goes like this:
>
> ```
> # Define a special virtual location for your cpp files
> location ~* \.(cpp|h)$ {
>     # Unless a GET parameter 'raw' is set with 'yes'
>     if ($arg_raw = 'yes') {
>         break;
>     }
>
>     # Redirect all the requests for *.cpp and *.h files to another location @js
>     try_files @js @js;
> }
>
> location @js {
>     ssi on;                  # Enable SSI in this location
>     default_type text/html;  # Tell the browser that what is returned is HTML
>
>     # Generate a suitable HTML document with an SSI insertion
>     return 200 '<!DOCTYPE html>
>                 <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.9.0/styles/default.min.css">
>                 <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.9.0/highlight.min.js"></script>
>                 <script>hljs.initHighlightingOnLoad();</script>
>                 <pre><code class="cpp"><!--# include virtual="$uri?raw=yes" --></code></pre>';
> }
> ```
>
> Now here is what happens if you request some `*.cpp` file in your browser:
>
> * The request goes to the first location, because the URI ends with `cpp`.
> * Then it is redirected to the second location `@js`, because there is no GET parameter `raw` in your request.
> * In the second location the SSI template is generated with return and then immediately processed by the SSI engine because of `ssi on`.
> * The include `virtual="$uri?raw=yes"` tells the SSI engine to make another request (subrequest) from within Nginx to the originally requested file (the internal variable $uri stores the original URI, that is the web path to your cpp file). The difference between the request from your browser and the subrequest made by Nginx is `?raw=yes`.
> * The subrequest again is handled by the first location, but it never goes to the second one, because of the raw GET parameter. In this case the `raw` contents of the cpp file is returned as a response to the subrequest.
> * The SSI engine combines this response with the rest of the template and returns the result to the browser. Additionally, default_type tells the browser to render the result as an HTML document.
>
> You can see an example of the output here. I used [this](https://highlightjs.org/) highlighting library for this example. You can change it with whatever you prefer simply modifying the SSI template.
