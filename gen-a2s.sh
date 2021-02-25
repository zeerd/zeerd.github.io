#!/bin/bash

install -d .tmp
echo ""  > .tmp/Makefile

FILES=$(find public/  -type f \( -name '*.a2s' \) -print0 | xargs -0)
for i in $FILES
do
    SVG=${i%.*}.svg
    echo $SVG: $i >> .tmp/Makefile
    echo -e \\ttools/asciitosvg/a2s -i$i -o$SVG >> .tmp/Makefile
    echo >> .tmp/Makefile
done

make -f .tmp/Makefile
