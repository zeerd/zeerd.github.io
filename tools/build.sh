#!/bin/bash

cd lemon-php
pwd
cc -o lemon lemon.c

cd -
cd jlexphp
make

cd -
cd asciitosvg
pwd
make

cd -
install -d ~/.a2s/objects/
cp asciitosvg/objects/* ~/.a2s/objects/

