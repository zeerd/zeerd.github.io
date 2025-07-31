---
layout: post
title: 大语言模型 API： 工具调用
tags: [Ollama, OpenAI, API]
categories: [AI]
---

[官方例子](https://github.com/ollama/ollama-python/blob/main/examples/tools.py)在此。
<!--break-->

实际使用中，我发现`Qwen`模型`format`参数和`tools`参数同时存在时，`tools`参数会失效。
因此，需要区分传入：


```python
# pip install ollama genson

import os
import json
import sys

from ollama import Client
from genson import SchemaBuilder

host = sys.argv[1] if len(sys.argv) > 1 else 'localhost'
model = sys.argv[2] if len(sys.argv) > 2 else 'qwen3-8b'

client = Client(
    host=f'http://{host}:11434'
)
messages = [
    {
        "role": "system",
        "content": """
        你支持以下工具：
        1) 给定函数名获取函数的完整声明。
        请遵守：
        - 当问题涉及未知函数时必用工具
        - 不要解释工具机制
        """
    },
    {
        "role": "user",
        "content": (
            "编写一个演示如何使用make_joke和send_joke的示例程序(sample-code)。"
        )
    }
]


def get_decl(function_name: str):
    functions = {
        "make_joke": 'const std::string& make_joke(void);',
        "send_joke": 'bool send_joke(const std::string& joke);',
    }
    return functions[function_name]


# 定义工具函数注册表
tool_func_map = {
    "get_decl": get_decl,
    # 以后可以加更多工具
}


def build_format(formats):
    builder = SchemaBuilder()
    builder.add_object(formats)
    return builder.to_schema()


def chat(messages, format=None):
    print(json.dumps(messages, ensure_ascii=False, indent=4, default=str))
    response = client.chat(
        model=model,
        messages=messages,
        tools=[
            {
                "function": {
                    "name": "get_decl",
                    "parameters": {
                        "properties": {
                            "function_name": {"type": "string"}
                        },
                        "type": "object",
                    }
                },
                "type": "function",
            }
        ],
        format=format,
    )
    return response


def call_function(response):
    tool_responses = []
    # 正确追加 assistant 回复
    assistant_message = {
        "role": "assistant",
        "content": response['message'].get('content', ''),
        'tool_calls': response['message']['tool_calls']
    }
    tool_responses.append(assistant_message)

    for call in response.message.tool_calls:
        func_name = call.function.name
        func_args = call.function.arguments
        # 动态查找并调用
        if func_name in tool_func_map:
            result = tool_func_map[func_name](**func_args)
        else:
            result = {"error": f"未找到工具函数: {func_name}"}

        tool_responses.append({
            "role": "tool",
            "content": json.dumps(result, ensure_ascii=False),
            'tool_name': call.function.name
        })
    return tool_responses


# 注意：第一次提问期待AI调用工具，这次不能带format。
response = chat(messages)

# 检查是否返回了工具调用指令
if 'tool_calls' in response['message']:
    print(f"✅ {model} 支持工具调用")

    tool_responses = call_function(response)
    messages.extend(tool_responses)

    # 第二次提问，期待AI回复最终答案，这次可以带format
    response = chat(messages, format=build_format({"sample-code": ""}))
    response = response.message.content
    response = json.loads(response)
    print(f"---\n最终回复内容: \n{response['sample-code']}")
else:
    print(f'response={response}')
    print(f"❌ {model} 不支持工具调用")
```


输出结果（某一次）：

````
---
最终回复内容: 
int main() {
    std::string my_joke = make_joke();
    if (send_joke(my_joke)) {
        std::cout << "Joke sent successfully.";
    } else {
        std::cout << "Failed to send joke.";
    }
    return 0;
}
```
