---
name: wealth-mcp-skill
description: 通过本地 Node Client 调用财富管理远程 MCP Gateway，查询基金、股票行情、市场、黄金、财经资讯和金融知识。用户询问财富数据、基金或股票分析、市场行情、黄金报价、财经新闻或金融概念时使用；只依据 MCP 返回数据作答，不执行交易，不承诺收益。
---

# 财富管理 MCP

通过本 Skill 内置的 Node Client 调用远程财富 MCP。不要要求目标平台预先配置 `.mcp.json`。

## 执行流程

1. 根据用户意图从 [场景目录](references/scenarios.md) 选择业务说明；需要详细规则时读取 `skills/<场景名>/SKILL.md`。
2. 首次使用或工具定义不明确时运行 `node scripts/client.mjs list-tools wealth-ai-gateway`，以后台返回的 `inputSchema` 为准。
3. 在 PowerShell、cmd、Codex 或 WorkBuddy 中，把参数写入 UTF-8 临时 JSON 文件，再使用 `@文件路径` 传入；调用结束后删除临时文件。
4. 执行 `node scripts/client.mjs call wealth-ai-gateway <tool_name> @<params_file>`。
5. 只依据 stdout 中的 MCP 结果回答；失败时报告 `error.code` 和 `error.message`，不要编造数据。

## 命令

连接测试：

```bash
node scripts/client.mjs probe wealth-ai-gateway
```

发现工具及参数定义：

```bash
node scripts/client.mjs list-tools wealth-ai-gateway
```

调用工具：

```bash
node scripts/client.mjs call wealth-ai-gateway querySecuQuote_7681 @scripts/request-<唯一后缀>.json
```

## 调用约束

- 工具名称必须来自 `scripts/tool-manifest.json` 或实时 `list-tools` 结果。
- 默认串行调用。批量任务先用第一个标的探测，成功后再继续。
- 不默认调用 KYC、用户记忆、个人指标、家庭资金配置、资产配置建议等个性化工具。仅在用户明确请求、身份权限已确认且获得本次授权时，设置 `WEALTH_ALLOW_SENSITIVE_TOOLS=1` 后调用。
- 不把访问令牌写入 Skill 文件、命令参数或仓库。需要额外请求头时，通过进程环境变量 `WEALTH_MCP_HEADERS_JSON` 注入。
- 当前内部地址使用 HTTP，仅在受控公司网络内使用；不要将该地址直接暴露为公网服务。
- 不执行买入、卖出、申购、赎回或其他交易指令。

## 返回处理

- `ok: true`：读取 `result.content`；保留数据日期、单位、来源和缺失字段。
- `ok: false`：读取结构化错误，不得把失败当作空结果。
- 多个工具结果存在冲突时，说明工具名称、数据时间和差异，不自行选择有利结果。

完成回答时注明：`数据来源：内部财富管理 MCP 服务。`
