---
layout: post
title: 大语言模型 API： 结构化输出
tags: [Ollama, OpenAI, API]
categories: [AI]
---

官方提供了通过 [BaseModel](https://github.com/ollama/ollama-python/blob/main/examples/structured-outputs.py) 规范输出格式的例子。
<!--break-->

但是，实际使用的情况下，很多时候提示词都是从模板中读取出来的，输出格式也不是限定的，需要根据实际情况动态生成。而无法预先通过`BaseModel`为每种情况创建子类。

下面，给出了一个借助`Genson`动态生成`JSON Schema`的例子，用于辅助`Ollama`进行输出内容的规范化。


```python
# pip install ollama genson

import json
import os
from ollama import Client
from genson import SchemaBuilder

# 提供一个回答问题的格式模板
# 这里的值（即例子中的0、""和False）并本身不重要，重要的是他们表达了自己的类型
json_data = {
    "Summary": "",
    "Points": [
        {
            "Percent": 0,
            "Abstract": "",
            "Key": False
        }
    ]
}

# 使用 Genson 库生成 JSON Schema
# 这将生成一个标准的 JSON Schema ，描述了 json_data 的结构
builder = SchemaBuilder()
builder.add_object(json_data)
fmt = builder.to_schema()

client = Client(host='http://localhost:11434')
# 简单起见，直接读取本脚本自身作为提示词的一部分
with open(os.path.abspath(__file__), 'rb') as f:
    content = f.read().decode('utf-8')

# 调用 ollama 接口提问
response = client.chat(
    model='qwen3:32b',
    messages=[
        {
            'role': 'user',
            'content': (
                "请对下面代码进行审查。\n"
                "首先，使用一句话，总结一下全文(Summary)。\n"
                "然后，概括出最多不超过3条的摘要(Abstract)，并逐一列出它们。"
                "说明每个摘要占用篇幅的百分比(Percent)及是否为关键点(Key)。\n"
                f"---\n{content}\n---\n"
            )
        },
    ],
    format=fmt,
)

# 输出反馈的答案，验证答案的格式是否与前文的“json_data”期望的一致
response_json = json.loads(response.message.content)
print(json.dumps(response_json, ensure_ascii=False, indent=4))
```

输出如下：


```json
{
    "Summary": "该代码使用 Ollama 和 Genson 库来审查代码，生成一个包含总结和摘要的 JSON 格式反馈，其中摘要部分包括百分比和关键点标志。",
    "Points": [
        {
            "Percent": 10,
            "Abstract": "导入了必要的库，如 json、os、ollama 和 genson，并定义了一个 JSON 数据模板。",
            "Key": true
        },
        {
            "Percent": 30,
            "Abstract": "使用 Genson 库生成 JSON Schema，以描述 json_data 的结构。",
            "Key": true
        },
        {
            "Percent": 60,
            "Abstract": "通过 Ollama 接口调用模型进行代码审查，传递提示词和格式要求，并输出验证结果。",
            "Key": true
        }
    ]
}
```

如果使用的是`OpenAI`的接口，则需要将`format=fmt`替换成：

```python
response_format={
    'type': 'json_schema',
    'json_schema':
    {
        "schema": fmt
    }
}
```
