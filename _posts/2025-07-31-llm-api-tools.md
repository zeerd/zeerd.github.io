---
layout: post
title: 大语言模型 API： 工具调用
tags: [Ollama, OpenAI, API]
categories: [AI]
---

[官方例子](https://github.com/ollama/ollama-python/blob/main/examples/tools.py)在此。
<!--break-->

实际使用中，我发现`Qwen`模型`format`参数和`tools`参数同时存在时，`tools`参数会失效。
这个现象目前在 Qwen（尤其是开源本地部署版本如 Qwen3-32B）中是已知的行为特征。

因此，需要区分传入：


```python
# pip install ollama genson

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

```
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

继续使用，又会发现新的问题：模型可能会分多次来调用工具。

这使得我们无法掌控附加 format 的时机。

目前最可靠的方法：

- 第一阶段：只用 tools，不用 format → 让模型自由发起多轮工具调用
- 最后一轮：启用 format="json" → 强制最终输出为 JSON 结构

问题：

这样会浪费一次请求。
因为最后一次回复 tool 没有附带 format ，导致这次的回答不可用。
必须再追加一次提问，这一次附带 format 。

```python
# 这次尝试使用 openai 的 API
# pip install openai genson

import json
import sys

from openai import OpenAI
from genson import SchemaBuilder

host = sys.argv[1] if len(sys.argv) > 1 else 'localhost:11434'
model = sys.argv[2] if len(sys.argv) > 2 else 'qwen3:32b'

client = OpenAI(
    base_url=f"http://{host}/v1",
    api_key="None"  # 任意字符串（服务端无需认证）
)

messages = [
    {
        "role": "system",
        "content": """
        你支持以下工具：
        1) 给定函数名获取函数的完整声明。

        当你为某个函数（例如A函数）生成单元测试用例时，请遵循以下指导原则：
        1. 使用tools功能获取目标函数（例如A函数）的声明信息。
        2. 在分析该函数的过程中，仔细检查是否存在对其他函数的调用或依赖。这包括但不限于直接函数调用、利用其他函数返回的数据等情况。
        3. 每当识别到一个依赖函数（例如B函数），无论何时何地，在继续生成测试用例之前，立即使用tools功能查询并获取该依赖函数的声明信息。
        4. 将新获取的依赖函数声明信息纳入考量范围，确保生成的测试用例能够正确处理依赖关系，并覆盖所有可能的情况。
        5. 重复步骤2至步骤4，直到完成对该函数及其所有依赖项的分析，并生成完整的单元测试用例。
        """
    },
    {
        "role": "user",
        "content": (
            "已知存在已经实现了的send_joke函数。\n"
            "参照如下设计图编写一个演示如何使用send_joke的示例程序(sample-code)。"
            "如果遇到了任何不存在的函数，请通过tools获取对应的函数声明。\n"
            """
            ```mermaid
            graph TD
                A[make_joke] --> B[send_joke]
                A --> C[print]
                B --> D[print]
            ```
            """
        )
    }
]


def get_decl(function_name: str):
    functions = {
        "make_joke": {
            "decl": 'const std::string& make_joke(void);',
            "header_file": "joke_generator.h"
        },
        "send_joke": {
            "decl": 'bool send_joke(const std::string& joke);',
            "header_file": "joke_generator.h"
        }
    }
    print(f"✅ get_decl({function_name})")
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
    print(
        '✅ chat:\n' +
        json.dumps(messages, ensure_ascii=False, indent=4, default=str)
    )
    response = client.chat.completions.create(
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
        response_format={
            'type': 'json_schema',
            'json_schema':
            {
                "name": 'sample-code',
                "schema": format
            }
        },
    )
    return response.choices[0]


def call_function(response):
    tool_responses = []
    # 正确追加 assistant 回复
    assistant_message = {
        "role": "assistant",
        "content": response.message.content,
        'tool_calls': [
            {
                "id": call.id,
                "type": call.type,
                "function": {
                    "name": call.function.name,
                    "arguments": call.function.arguments
                }
            }
            for call in (response.message.tool_calls or [])
        ]
    }
    tool_responses.append(assistant_message)

    for call in response.message.tool_calls:
        func_name = call.function.name
        func_args = call.function.arguments
        # 如果func_args是字符串，尝试解析为字典
        if isinstance(func_args, str):
            func_args = json.loads(func_args)

        # 动态查找并调用
        if func_name in tool_func_map:
            result = tool_func_map[func_name](**func_args)
        else:
            result = {"error": f"未找到工具函数: {func_name}"}

        tool_responses.append({
            "role": "tool",
            "content": json.dumps(result, ensure_ascii=False),
            'tool_call_id': call.id
        })
    return tool_responses


# 注意：第一次提问期待AI调用工具，这次不能带format。
response = chat(messages)
# 循环处理所有 tool_calls，直到拿到最终 content
while getattr(response.message, "tool_calls", None):
    print(f"✅ {model} 支持工具调用")
    tool_responses = call_function(response)
    messages.extend(tool_responses)
    # 再次提问，如果AI继续调用工具，则循环；
    # 否则，这次回答的是我们的问题，但是不带 format 只能忽略（浪费一次 token )
    response = chat(messages)

# 重新提问，这次附带 format 。
final_prompt = {
    "role": "user",
    "content": (
        "现在你已获取所有依赖函数信息，请生成测试用例，输出格式必须为 JSON。"
    )
}
messages.append(final_prompt)
response = chat(messages, format=build_format({"sample-code": ""}))

res = response.message.content
try:
    res = json.loads(res)
    print(f"---\n最终回复内容: \n{res['sample-code']}")
except json.JSONDecodeError:
    print(f"❌ 无法解析JSON格式的回复: {response}")
    response = {'sample-code': response}
```
