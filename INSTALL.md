# Agent 安装协议

本文档面向执行安装的 LLM/Agent。仅在用户明确要求安装本仓库时执行。

## 安装目标

安装以下三个部分：

1. `.mcp.json` 中声明的财富 MCP 连接。
2. `skills/` 下的财富场景 Skill。
3. `wealth-find-finance-skill` 能力发现入口。

不安装 Python、Node 或本地计算脚本。

## 强制规则

1. 先识别当前 Agent 平台、Skill 目录、MCP 配置格式和配置作用域。
2. 修改任何平台配置前，向用户展示目标文件、连接地址和预期修改，并取得确认。
3. 不覆盖已有同名 Skill；先比较版本或将旧目录备份为独立名称。
4. 不复制 `mcp.json` 中的 `autoApprove` 到新平台。工具审批由目标平台决定。
5. 不把密钥、账号、PIN 或个人信息写入仓库。
6. 当前地址为 HTTP SSE。无法访问内网域名时停止并报告，不尝试猜测公网地址。

## 安装流程

### 1. 检测已有能力

检查是否已经存在 `wealth-ai-gateway`，或是否能看到以下任一工具：

- `queryKypInfo_3107`
- `queryFundValuation_6326`
- `queryMarketData_3101`
- `querySecuQuote_7681`
- `queryGoldPrice_7224`

若已连接，保留现有连接，只继续检查和安装缺失的 Skill。

### 2. 选择 MCP 配置

- 支持 Plugin 的 Codex/ChatGPT：读取 `.codex-plugin/plugin.json` 和 `.mcp.json`。
- WorkBuddy 或兼容当前配置格式的平台：参考 `platform-configs/workbuddy-sse.json`。
- OpenClaw：参考 `platform-configs/openclaw.json`，优先使用平台 MCP 配置命令或受支持的配置编辑流程。
- 其他支持远程 SSE MCP 的客户端：参考 `platform-configs/generic-sse.json`，转换为该客户端要求的字段名。
- 不支持原生 MCP 的平台：停止 MCP 安装并说明当前版本没有 CLI 桥接层，不得伪装安装成功。

### 3. 安装 Skills

优先使用平台原生 Skill 安装器从当前仓库安装。没有安装器但允许文件操作时，将 `skills/` 下每个完整目录复制到该平台确认过的 Skill 根目录。

每个 Skill 目录必须保持完整，至少包含 `SKILL.md`；含 `references/` 或 `agents/` 时一并复制。

### 4. 重载并验证

按平台能力重载 MCP 和 Skills。然后验证：

1. `wealth-find-finance-skill/SKILL.md` 已存在并可发现。
2. 11 个场景 Skill 均已存在。
3. MCP 能完成初始化和工具发现。
4. 工具列表至少包含一个核心工具。
5. 使用只读测试问题验证路由，例如“查询一只基金的基础信息”，不要调用 KYC、用户记忆或个性化配置工具。

### 5. 输出安装报告

报告以下内容：

- 目标平台和安装作用域。
- Skills 实际安装路径。
- MCP 配置实际写入位置。
- MCP 地址和传输方式。
- 发现的工具数量及核心工具检查结果。
- 未完成步骤、权限问题或网络问题。

只有 MCP 工具可发现且能力发现 Skill 已加载时，才能报告安装成功。
