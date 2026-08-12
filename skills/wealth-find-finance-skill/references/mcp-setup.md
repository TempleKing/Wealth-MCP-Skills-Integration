# 财富 MCP 配置参考

## 当前连接

- 名称：`wealth-ai-gateway`
- 传输：`sse`
- 地址：`http://mcp-gateway.jd.com/mcp/wealthAiGateway/sse`
- 网络范围：现有内网环境

## 配置原则

1. 优先使用目标平台原生 MCP 配置或 Plugin 安装能力。
2. 修改前确认具体配置位置和作用域，向用户展示将写入的连接名称、地址和传输方式。
3. 不默认设置工具自动批准，不复制旧 `mcp.json` 的 `autoApprove`。
4. 配置后重新加载工具并检查 `tools/list` 或平台等效的工具发现结果。
5. 当前地址不可达时报告网络或域名限制，不改写成猜测的公网地址。

## 平台选择

- Codex/ChatGPT Plugin：使用仓库根目录 `.codex-plugin/plugin.json` 和 `.mcp.json`。
- WorkBuddy：使用仓库根目录 `platform-configs/workbuddy-sse.json` 的连接对象。
- OpenClaw：使用仓库根目录 `platform-configs/openclaw.json` 中的 `mcp.servers` 条目。
- 其他 SSE 客户端：使用 `platform-configs/generic-sse.json` 并按客户端字段名称转换。
- 不支持原生 MCP：当前版本没有 CLI 兜底，停止并说明限制。
