---
layout: post
title: Python 脚本直接调用摩卡社区的 Hosted 的 MCP 服务
tags: [MCP, Python]
categories: [AI]
---

[这里](https://github.com/theailanguage/mcp_client)有一些例子，但是实现的有限繁琐。
因此，我将核心代码抽出来看看。

<!--break-->

例如：[Fetch网页内容抓取](https://www.modelscope.cn/mcp/servers/@modelcontextprotocol/fetch)

页面右侧可以生成一个 URL ，类似：`https://mcp.api-inference.modelscope.net/xxxxx/sse`


运行下面脚本时， mcp_url 传入这个 URL； target_url 传入想获取的网址


```python
import asyncio
import sys

from mcp import ClientSession
from mcp.client.sse import sse_client


class FetchMarkdown:
    def __init__(self, mcp_url):
        self.mcp_url = mcp_url

    async def fetch(self, target_url):
        async with sse_client(url=self.mcp_url) as streams:
            async with ClientSession(*streams) as session:
                await session.initialize()
                response = await session.list_tools()
                tools = response.tools
                tool_names = [tool.name for tool in tools]
                print("\nConnected with tools:", tool_names)

                if 'fetch' in tool_names:
                    result = await session.call_tool(
                        'fetch', {'url': target_url}
                    )
                    print(f'\nresult:\n{result.content[0].text}')


async def main():
    mcp_url = (
        sys.argv[1]
        if len(sys.argv) > 1
        else 'https://mcp.api-inference.modelscope.net/xxxxx/sse'
    )
    target_url = sys.argv[2] if len(sys.argv) > 2 else 'https://example.org'
    fetcher = FetchMarkdown(
        mcp_url=mcp_url
    )
    await fetcher.fetch(target_url)


if __name__ == "__main__":
    asyncio.run(main())
```

核心就是 [mcp](https://modelcontextprotocol.io/) 的`Python SDK`提供了一系列类似 [sse_client](https://github.com/modelcontextprotocol/python-sdk/blob/v1.12.4/src/mcp/client/sse.py#L24) 的接口。根据需求选用。

比如[smithery.ai](https://smithery.ai)的服务基本上就是使用 [streamablehttp_client](https://github.com/modelcontextprotocol/python-sdk/blob/v1.12.4/src/mcp/client/streamable_http.py#L441) 来访问。


下附一个基本的MCP Server框架代码（就不额外开个帖子了）：

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("index", port=8088, log_level='DEBUG')  # 创建 MCP 服务器
g_indexes = []


@mcp.tool()
def build(indexes: list) -> bool:
    global g_indexes
    g_indexes = indexes.copy()
    return True


@mcp.tool()
def query(text: str) -> list:
    return g_indexes + [text]


if __name__ == "__main__":
    mcp.run(transport='sse')  # 启动服务！

```
