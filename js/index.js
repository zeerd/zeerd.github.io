let path = null

setInterval(() => {
//  if (path !== window.location.pathname) {
    path = window.location.pathname
    window.mermaid.initialize({ theme: 'default' })
    window.mermaid.init(undefined, document.querySelectorAll('.language-mermaid'))
//  }
}, 1000)

setInterval(() => {
    // const prefix = "https://graphviz.zeerd.com/?";
    const prefix = "https://g.gravizo.com/svg?";
    var elements = document.getElementsByClassName('language-graphviz');
    for (var i=0, len=elements.length|0; i<len; i=i+1|0) {
        encoded = encodeURI(prefix + elements[i].innerHTML);
        //elements[i].innerHTML = "<img src='" + encoded + "'>";
        elements[i].innerHTML = "<object type='image/svg+xml' style='width:100%' data='"
                              + encoded + "'></object>";
        elements[i].className = "graphviz";
        elements[i].outerHTML = elements[i].outerHTML.replace(/code/g,"div");
    }
}, 1000)
