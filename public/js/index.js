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

function DrawPlantUML(type) {
    var elements = document.getElementsByClassName('language-plantuml');
    for (var i=elements.length-1, len=elements.length|-1; i>=0; i=i-1|-1) {
        // if(elements[i] !== undefined) {
            if(type == "IPv6") {
                encoded = encodeURI("https://vultr6.zeerd.com/plantuml.php?uml=" + elements[i].innerHTML);
            }
            else {
                encoded = encodeURI("http://vultr.zeerd.com/plantuml.php?uml=" + elements[i].innerHTML);
            }
            encoded = encoded.replace(/#/g, "%23");
            if(type == "IPv6") {
                elements[i].innerHTML = "<object type='image/svg+xml' style='width:100%;height:100%' "
                                      + "data='" + encoded + "'></object>";
            }
            else {
                elements[i].innerHTML = "<img alt='PlantUML' src='" + encoded + "'>";
            }
            elements[i].outerHTML = elements[i].outerHTML.replace(/code/g,"div");
            elements[i].className = "plantuml";
        // }
    }
}

var img = document.createElement('img');
img.src = "https://vultr6.zeerd.com/1x1.png";
img.onload = function() {
    setInterval(() => {
        DrawPlantUML("IPv6");
    }, 1000)
};
img.onerror = function() {
    setInterval(() => {
        DrawPlantUML("IPv4");
    }, 1000)
};
