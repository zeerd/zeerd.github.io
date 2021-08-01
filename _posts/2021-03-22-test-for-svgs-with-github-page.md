---
layout: post
title: 测试SVG图片显示机制
tag: [UML,PlantUML,Dot,Graphviz,Gravizo]
---

<!--break-->

![cached image](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/zeerd/zeerd.github.io/master/public/2021/03/22/test.txt)

![Alt text](https://g.gravizo.com/svg?
  digraph G {
    aize ="4,4";
    main [shape=box];
    main -> parse [weight=8];
    parse -> execute;
    main -> init [style=dotted];
    main -> cleanup;
    execute -> { make_string; printf}
    init -> make_string;
    edge [color=red];
    main -> printf [style=bold,label="100 times"];
    make_string [label="make a string"];
    node [shape=box,style=filled,color=".7 .3 1.0"];
    execute -> compare;
  }
)
