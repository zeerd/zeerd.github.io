---
layout: post
title: SQL将指定表排序并输出满足条件的记录是第几条
tag: [SQL]
categories: [Program]
---

用于获取名次等的查询功能。

<!--break-->

```sql
Select @result=fieldx from(
     Select *, ROW_NUMBER() over (order by fieldy desc) as fieldx from table where xxx
    ) AS T
Where T.xx = xx
```
