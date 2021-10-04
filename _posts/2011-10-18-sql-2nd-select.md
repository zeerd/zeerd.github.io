---
layout: post
title: sql server实现循环利用检索结果进行二次操作
tags: [SQL]
---
<p>有一个需求，从table1里面搜索满足condition1的记录。然后，针对每一条记录进行操作。</p>
<!--break-->
<p>通常来说，可以通过游标实现。但是，据说这玩意效率有些问题。于是，有个替代方案。</p>
<p>创建一个带有索引值的临时表。然后通过索引值遍历临时表。</p>

```sql
Select id = indentity(int,0,1) , tmp.xxfield into #temptable
    From(
	    Select xxxfield from dbo.table1
		    Where condition1
		) as tmp
Select @iMax = count(*) from #temptable
    Set @i = 0
	While @i < @iMax begin
	    Select @xxx = xxxfield from #temptable where id = @i
		... ...
	Set @i = @i + 1
End
Drop table #temptable
```
