# 财富管理 MCP Skill

将远程财富 MCP Gateway、场景化 Skill 和能力发现入口打包在同一个仓库中。用户可把仓库链接交给具备文件、网络和配置权限的 Agent，由 Agent 按 `INSTALL.md` 安装并验证。

## 包含内容

- 财富 MCP 连接配置：`.mcp.json`
- 11 个财富场景 Skill：`skills/`
- 能力发现与路由 Skill：`skills/wealth-find-finance-skill/`
- WorkBuddy、OpenClaw 和通用 SSE 配置示例：`platform-configs/`
- Codex/ChatGPT Plugin 清单：`.codex-plugin/plugin.json`
- JoyCode 历史模式配置：`integrations/joycode/mode.json`

## 给 Agent 的安装方式

发布到 Git 仓库后，将仓库链接和下面这段话交给 Agent：

```text
请下载并安装这个财富管理能力仓库。先阅读 INSTALL.md，说明将修改哪些配置并征得我的同意；然后安装 Skills、配置财富 MCP，最后验证工具列表和能力发现 Skill。
```

Agent 是否能自动完成，取决于当前平台是否允许下载文件、安装 Skill、修改 MCP 配置和重载工具。没有这些权限的平台只能按照配置示例手动安装。

## 当前连接限制

当前 MCP 地址为：

```text
http://mcp-gateway.jd.com/mcp/wealthAiGateway/sse
```

这是 HTTP SSE 地址，适合能够访问该域名的现有内网环境。正式对外发布前应提供可公开访问的 HTTPS MCP 地址，并补充认证、隐私政策和服务条款。

## 目录结构

```text
wealth-mcp-skill/
├── .codex-plugin/plugin.json
├── .mcp.json
├── README.md
├── INSTALL.md
├── VERSION
├── CHANGELOG.md
├── platform-configs/
├── integrations/joycode/
├── mcp.json                  # 原平台兼容配置，保留
├── mode.json                 # 原 JoyCode 配置，保留
└── skills/
    ├── wealth-find-finance-skill/
    └── 11 个财富场景 Skill/
```

## 发布成一个链接

1. 将整个 `wealth-mcp-skill` 目录提交到 Gitee 或 GitHub。
2. 为发布版本打标签，例如 `v0.1.0`。
3. 把仓库链接交给 Agent，不要只发送某一个 `SKILL.md`。
4. 更新版本时同步修改 `VERSION`、`CHANGELOG.md` 和 `plugin.json`。

## 安全约定

- 新的 Plugin 配置不默认自动批准工具调用。
- 涉及 KYC、用户记忆、个人指标和资产配置的工具必须由平台按权限策略处理。
- `mcp.json` 是原平台兼容文件，其中的 `autoApprove` 不代表推荐的对外默认策略。
- Skill 只能基于 MCP 返回的数据回答，不得补造实时行情、估值或个性化信息。
