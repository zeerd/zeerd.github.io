---
layout: post
title: 一些在使用gtest时可能用到的扩展函数接口
tag: [gtest]
categories: [Program]
---

<!--break-->

# 内部

获取当前正在运行的测试套的名称：

```cpp
::testing::UnitTest::GetInstance()->current_test_info()->test_suite_name()
```

注意，在旧版中存在另一个接口：

```cpp
::testing::UnitTest::GetInstance()->current_test_info()->test_case_name()
```

获取当前正在运行的测试用例的名称：

```cpp
::testing::UnitTest::GetInstance()->current_test_info()->test_suite_name()
```

# 外部

gtest生成的程序存在一个参数，叫做“--gtest_output=”。可以将结果导出到json或者xml文件中。

但是，结果的内容比较少，可能无法满足一些“富”报告的需求。此时可以通过一个接口来实现在报告中追加字段。

例如，下面的代码就可于i在报告中添加一个叫做“TestPurpose”的关键字，其值为“测试目的...”。

```cpp
testing::Test::RecordProperty("TestPurpose", "测试目的...");
```
