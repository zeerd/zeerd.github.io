---
layout: post
title: 在Jenkins中借助Gerrit-trigger插件实现自动标注CppCheck结果到Gerrit的Patchset
tag: [Jenkins,Gerrit]
---

[Gerrit](https://www.gerritcodereview.com/)存在如下的REST API，可以让用户通过curl提交Review结果到Gerrit的Patchset。基于这个API，我们可以实现在[Jenkins](https://jenkins.io/)中借助[Gerrit-trigger](http://wiki.jenkins-ci.org/display/JENKINS/Gerrit+Trigger)插件自动标注[CppCheck](http://cppcheck.sourceforge.net/)结果到Gerrit的Patchset。

```
Set Review

'POST /changes/{change-id}/revisions/{revision-id}/review'
```
<!--break-->

CppCheck的结果是面向整个工程的，而Gerrit只能针对班次变更的文件进行备注。所以，还需要获取一下变更文件的列表。这里使用了 [jshon](http://kmkeen.com/jshon/) 这个工具进行json数据解析。

```bash
CHANGED_FILES_ORIG=$(curl --header "Content-Type: application/json;charset=UTF-8" \
     --user $HTTPUSER:$HTTPPASSWD \
    "$GERRIT_URL/a/changes/?q=$GERRIT_CHANGE_NUMBER&o=CURRENT_REVISION&o=CURRENT_FILES")
    
CHANGED_FILES=$(echo ${CHANGED_FILES_ORIG//)]\}\'/} | jshon -e 0 -e revisions -a -e files -k) 
```

使用下面脚本进行Cpp Check检查，并解析结果，生成SetReview这个API需要的Binary Data文件。

```bash
cppcheck --enable=all --inconclusive 2> $PLAIN_RSLT

CNT=$(grep -rnw . $PLAIN_RSLT | wc -l)

if [ "x$CNT" == "x0" ] ; then
    REVIEW_MSG="Good job.\n\n"
else
    REVIEW_MSG="CppCheck found $CNT error(s)/warning(s) in your codes.\n\n"
fi
echo "{" > $REVIEW_FILE
echo "  \"tag\": \"jenkins\"" >> $REVIEW_FILE
echo ", \"message\": \"$REVIEW_MSG\"" >> $REVIEW_FILE
if [ "x$CNT" != "x0" ] ; then
    echo ", \"labels\": {\"Code-Review\": -1}" >> $REVIEW_FILE
    echo ", \"comments\": {" >> $REVIEW_FILE
    awk -v folder=$GERRIT_PROJECT"/" \
        -v cc="$CHANGED_FILES" \
        'BEGIN{
          FS=":";
          split(cc, ccs, " ");
          for(f in ccs) {
            valids[ccs[f]]=1;
          }
        }
        {
          f=$1;n=$2;c="";
          for(i=3;i<=NF;i++){
            if(c == "") {
              c = $i;
            }
            else {
              c = c":"$i;
            }
          }
          gsub("[[]","",f);
          sub(folder,"",f);
          gsub("]","",n);
          gsub("\"","`",c);
          msg[f][line][0] = n;
          msg[f][line][1] = c;
          line++;
        }
        END{
          file=0;
          for(f in msg) {
            if(valids[f] == 1) {
              line=0;
              if(file > 0) { printf(",\n"); }
              printf("   \"%s\": [\n", f);
              for(n in msg[f]) {
                if(line > 0) { printf(",\n"); }
                printf("    {\"line\": %s, \"message\": \"%s\"}", 
                                                 msg[f][n][0], msg[f][n][1]);
                line++;
              }
              printf("\n   ]\n");
              file++;
            }
          }
        }' $PLAIN_RSLT >> $REVIEW_FILE
    echo "  }" >> $REVIEW_FILE
fi >> $REVIEW_FILE
echo "}" >> $REVIEW_FILE
```

最后，将上面生成的review结果提交到Gerrit服务器。

```bash
curl -X POST\
    --header "Content-Type: application/json;charset=UTF-8" \
    --data-binary @$REVIEW_FILE \
    --user $HTTPUSER:$HTTPPASSWD \
    "$URL/a/changes/$GERRIT_CHANGE_ID/revisions/$GERRIT_PATCHSET_REVISION/review"
```
