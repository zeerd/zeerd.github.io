---
layout: post
title: 测试程序端导出gtest结果到第三方
tag: [gtest]
---

gtest是目前广为使用的测试框架之一。但是，有些时候，处于客户要求或者其他一些目的，我们需要将gtest的结果在运行态直接导出。下面的代码给出一种可行的导出方案。这段代码需要在TearDown中被执行。

<!--break-->

```cpp
void GTEST_REPORT(void)
{
    const ::testing::TestInfo* info
        = ::testing::UnitTest::GetInstance()-&gt;current_test_info();
    const ::testing::TestResult&amp; result = *info-&gt;result();

    char *name = NULL;
    asprintf(&amp;name, "%s.%s", info-&gt;test_case_name(), info-&gt;name());

    if(name != NULL) {

        std::string errors = "如下条目NG:\n";
        int i, max = result.total_part_count();

        for(i=0;i&lt;max;i++) {
            char p[1024];
            snprintf(p, 1024,
                     "%s(%d)\n",
                     ::basename(result.GetTestPartResult(i).file_name()),
                     result.GetTestPartResult(i).line_number());
            errors += p;
        }

        if(HasFailure()) {
            printf("%s\n", errors.c_str());
        }
        else {
            printf("与期望结果一致");
        }

        free(name);
    }
}
```
