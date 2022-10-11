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
        // encoded = encodeURI(elements[i].innerHTML);
        // elements[i].innerHTML = "<img alt='DOT sample with Gravizo' src='" + prefix + encoded + "'>";
        encoded = encodeURI(prefix + elements[i].innerHTML);
        elements[i].innerHTML = "<object type='image/svg+xml' style='width:100%' data='"
                              + encoded + "'></object>";
        elements[i].className = "graphviz";
        elements[i].outerHTML = elements[i].outerHTML.replace(/code/g,"div");
    }
}, 1000)

setInterval(() => {
    const prefix = "https://vultr6.zeerd.com/plantuml.php?uml=";
    var elements = document.getElementsByClassName('language-plantuml');
    for (var i=0, len=elements.length|0; i<len; i=i+1|0) {
        encoded = encodeURI(prefix + elements[i].innerHTML);
        encoded = encoded.replace(/#/g, "%23");
        // elements[i].innerHTML = "<img alt='DOT sample with plantuml' src='" + encoded + "'>";
        elements[i].innerHTML = "<object type='image/svg+xml' style='width:100%;height:100%' data='"
                              + encoded + "'></object>";
        elements[i].className = "plantuml";
        elements[i].outerHTML = elements[i].outerHTML.replace(/code/g,"div");
    }
}, 1000)
