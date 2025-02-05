# firefox-headless-server MCP Server

一个基于 TypeScript 的 Model Context Protocol 服务器，用于在无头模式下启动和控制 Firefox 浏览器。它提供了以下核心功能：

## 功能

### 工具
- `start_browser` - 启动一个新的无头浏览器会话。
- `navigate_to` - 导航到指定的 URL。
- `get_page_title` - 获取当前页面的标题。
- `get_page_source` - 获取当前页面的源代码。
- `download_page` - 下载当前页面到指定路径。
- `close_browser` - 关闭浏览器会话。

## 开发

安装依赖：
```bash
npm install
```

构建服务器：
```bash
npm run build
```

开发时自动重建：
```bash
npm run watch
```

## 安装

要与 Claude Desktop 一起使用，添加服务器配置：

在 MacOS 上：`~/Library/Application Support/Claude/claude_desktop_config.json`
在 Windows 上：`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "firefox-headless-server": {
      "command": "/path/to/firefox-headless-server/build/index.js"
    }
  }
}
```

## 调试

由于 MCP 服务器通过 stdio 进行通信，调试可能会比较困难。我们推荐使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector)，它作为一个包脚本提供：

```bash
npm run inspector
```

Inspector 将提供一个 URL 来访问浏览器中的调试工具。
