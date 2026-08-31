# Wealth MCP Skills Integration

An installable AI agent skill bundle that connects to a remote wealth-management MCP gateway through a lightweight local Node.js client.

This project follows a CLI-bridge architecture similar to mature MCP skill distributions: the agent reads `SKILL.md`, selects an appropriate business workflow, constructs tool arguments, and runs the bundled client. The client then performs the MCP handshake and forwards the request to the remote server.

## Architecture

```text
User request
    ↓
AI agent reads SKILL.md and the relevant business workflow
    ↓
node scripts/client.mjs call ...
    ↓
Local MCP client
    ↓
Remote wealth-management MCP gateway
    ↓
Structured MCP result returned to the agent
```

The target platform does not need to register a separate `.mcp.json` file. It only needs to support skills, local command execution, Node.js, and network access to the gateway.

## Contents

```text
wealth-mcp-skill/
├── SKILL.md                     # Primary agent instructions
├── agents/openai.yaml           # Optional agent UI metadata
├── references/scenarios.md      # Business-workflow router
├── scripts/
│   ├── client.mjs               # MCP SSE client and CLI bridge
│   ├── server-manifest.json     # Remote server configuration
│   └── tool-manifest.json       # Tool names, descriptions, and schemas
└── skills/                      # Domain-specific workflow instructions
```

## Requirements

- Node.js 18 or later. Node.js 20 or later is recommended.
- An AI agent that can read skills and execute local commands.
- Network access to the configured MCP gateway.
- Access to this repository if it remains private.

No Python runtime, package compilation, local MCP daemon, or persistent `npm install` step is required.

## Install

Before installing from a private repository, sign in to GitHub and make sure Git can access the repository.

```bash
npx skills add https://github.com/TempleKing/Wealth-Mcp-Skill-Demo.git --skill wealth-mcp-skill -g -y
```

To install only for the current project, omit `-g`:

```bash
npx skills add https://github.com/TempleKing/Wealth-Mcp-Skill-Demo.git --skill wealth-mcp-skill -y
```

## Verify the Connection

Run the following command from the installed skill directory:

```bash
node scripts/client.mjs probe wealth-ai-gateway
```

A successful response includes `"ok": true`, the negotiated MCP protocol version, and server information.

Discover the currently available tools and their input schemas:

```bash
node scripts/client.mjs list-tools wealth-ai-gateway
```

## Call a Tool

Create a temporary UTF-8 JSON request file and pass it to the client:

```bash
node scripts/client.mjs call wealth-ai-gateway <tool_name> @scripts/request-<unique-id>.json
```

Tool names and arguments must follow `scripts/tool-manifest.json` or the latest `list-tools` response. Delete temporary request files after use and never commit customer identifiers, access tokens, or financial data.

## MCP Compatibility

The bundled client implements the legacy MCP SSE transport used by the current gateway:

1. Open an SSE connection.
2. Receive the session-specific message endpoint.
3. Send `initialize`.
4. Send `notifications/initialized`.
5. Use `tools/list` and `tools/call`.
6. Read JSON-RPC responses from the SSE stream.

## Security and Usage Boundaries

- Sensitive and personalized tools are blocked by default, including KYC, user-memory, recommendation, and asset-allocation functions.
- Do not store credentials in this repository. Supply approved request headers at runtime through `WEALTH_MCP_HEADERS_JSON` when required.
- The current server manifest points to an internal HTTP endpoint. Use this version only on a controlled corporate network.
- Before making the repository public, replace the internal endpoint with an approved public HTTPS gateway, add authentication and authorization, and complete privacy, compliance, and ownership reviews.
- Do not use this project to execute trades or provide guaranteed investment outcomes.

## Status

The following path has been validated locally:

```text
Local Node.js command
→ bundled MCP client
→ remote MCP gateway
→ tools/list or tools/call
→ structured result
```

The server exposed 33 MCP tools during the latest internal validation. Availability and schemas may change; use `list-tools` as the runtime source of truth.
