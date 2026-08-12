#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_MANIFEST_PATH = resolve(SCRIPT_DIR, 'server-manifest.json');
const TOOL_MANIFEST_PATH = resolve(SCRIPT_DIR, 'tool-manifest.json');
const CLIENT_NAME = 'wealth-mcp-skill';
const CLIENT_VERSION = '0.2.0';
const DEFAULT_TIMEOUT_MS = 30_000;

const SENSITIVE_TOOLS = new Set([
  'queryKycInfo_3105',
  'queryPersonalIndex_6139',
  'queryUserMemory_7495',
  'queryWealthUserMemory_8781',
  'queryUserMemoryProfile_9654',
  'queryFamilyFundsAllocation_3340',
  'queryAssetAllocationSuggestion_3341',
  'fundRecommend_5756',
  'queryCplStrategy_9613',
  'requestMethod_5731',
]);

class ClientError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
    this.details = details;
  }
}

function readJson(path, code = 'CONFIG_ERROR') {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ClientError(code, `无法读取 JSON：${path}`, { cause: error.message });
  }
}

function serverConfig(serverType) {
  const manifest = readJson(SERVER_MANIFEST_PATH);
  const config = manifest[serverType];
  if (!config) {
    throw new ClientError('ROUTE_ERROR', `未知 server_type：${serverType}`, {
      allowed_values: Object.keys(manifest),
    });
  }
  const endpoint = process.env.WEALTH_MCP_URL?.trim() || config.endpoint;
  if (!/^https?:\/\//i.test(endpoint)) {
    throw new ClientError('CONFIG_ERROR', 'MCP endpoint 必须是 HTTP(S) URL');
  }
  return { ...config, endpoint };
}

function extraHeaders() {
  const raw = process.env.WEALTH_MCP_HEADERS_JSON?.trim();
  if (!raw) return {};
  let headers;
  try {
    headers = JSON.parse(raw);
  } catch (error) {
    throw new ClientError('CONFIG_ERROR', 'WEALTH_MCP_HEADERS_JSON 不是合法 JSON', {
      cause: error.message,
    });
  }
  if (!headers || Array.isArray(headers) || typeof headers !== 'object') {
    throw new ClientError('CONFIG_ERROR', 'WEALTH_MCP_HEADERS_JSON 必须是对象');
  }
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
}

function withTimeout(promise, timeoutMs, code, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ClientError(code, message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class LegacySseMcpClient {
  constructor(endpoint, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.endpoint = endpoint;
    this.headers = headers;
    this.timeoutMs = timeoutMs;
    this.controller = new AbortController();
    this.messageEndpoint = null;
    this.nextId = 1;
    this.pending = new Map();
    this.endpointPromise = new Promise((resolveEndpoint, rejectEndpoint) => {
      this.resolveEndpoint = resolveEndpoint;
      this.rejectEndpoint = rejectEndpoint;
    });
  }

  async connect() {
    this.readTask = this.readEvents();
    this.messageEndpoint = await withTimeout(
      this.endpointPromise,
      this.timeoutMs,
      'CONNECT_TIMEOUT',
      '等待 MCP SSE endpoint 事件超时',
    );
    return this.messageEndpoint;
  }

  async readEvents() {
    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: { Accept: 'text/event-stream', ...this.headers },
        signal: this.controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new ClientError('CONNECT_ERROR', `SSE 连接失败：HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        throw new ClientError('PROTOCOL_ERROR', `服务端未返回 text/event-stream：${contentType}`);
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let event = { event: 'message', data: [] };
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line === '') {
            this.dispatchEvent(event);
            event = { event: 'message', data: [] };
          } else if (line.startsWith('event:')) {
            event.event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            event.data.push(line.slice(5).trimStart());
          } else if (line.startsWith('id:')) {
            event.id = line.slice(3).trim();
          }
        }
      }
      throw new ClientError('CONNECTION_CLOSED', 'MCP SSE 连接意外关闭');
    } catch (error) {
      if (this.controller.signal.aborted) return;
      const wrapped = error instanceof ClientError
        ? error
        : new ClientError('NETWORK_ERROR', error.message || String(error));
      this.rejectEndpoint(wrapped);
      for (const { reject } of this.pending.values()) reject(wrapped);
      this.pending.clear();
    }
  }

  dispatchEvent(event) {
    if (!event.data.length) return;
    const data = event.data.join('\n');
    if (event.event === 'endpoint') {
      try {
        const resolved = new URL(data, this.endpoint).toString();
        if (new URL(resolved).origin !== new URL(this.endpoint).origin) {
          throw new Error('跨域消息 endpoint 被拒绝');
        }
        this.resolveEndpoint(resolved);
      } catch (error) {
        this.rejectEndpoint(new ClientError('PROTOCOL_ERROR', '无效的 SSE endpoint 事件', {
          data,
          cause: error.message,
        }));
      }
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    if (payload.id === undefined || payload.id === null) return;
    const waiter = this.pending.get(String(payload.id));
    if (!waiter) return;
    this.pending.delete(String(payload.id));
    if (payload.error) {
      waiter.reject(new ClientError('MCP_ERROR', payload.error.message || 'MCP 请求失败', payload.error));
    } else {
      waiter.resolve(payload.result);
    }
  }

  async post(payload) {
    if (!this.messageEndpoint) throw new ClientError('STATE_ERROR', 'MCP Client 尚未连接');
    const response = await fetch(this.messageEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ClientError('HTTP_ERROR', `MCP POST 失败：HTTP ${response.status}`, {
        body: body.slice(0, 1000),
      });
    }
  }

  async request(method, params = {}) {
    const id = this.nextId++;
    const resultPromise = new Promise((resolveResult, rejectResult) => {
      this.pending.set(String(id), { resolve: resolveResult, reject: rejectResult });
    });
    try {
      await this.post({ jsonrpc: '2.0', id, method, params });
    } catch (error) {
      this.pending.delete(String(id));
      throw error;
    }
    return withTimeout(
      resultPromise,
      this.timeoutMs,
      'RESPONSE_TIMEOUT',
      `等待 MCP ${method} 响应超时`,
    );
  }

  async notify(method, params = {}) {
    await this.post({ jsonrpc: '2.0', method, params });
  }

  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
    });
    await this.notify('notifications/initialized', {});
    return result;
  }

  close() {
    this.controller.abort();
  }
}

async function withClient(serverType, action) {
  const config = serverConfig(serverType);
  if (config.transport !== 'sse') {
    throw new ClientError('CONFIG_ERROR', `暂不支持 transport：${config.transport}`);
  }
  const client = new LegacySseMcpClient(config.endpoint, extraHeaders());
  try {
    await client.connect();
    const serverInfo = await client.initialize();
    return await action(client, serverInfo, config);
  } finally {
    client.close();
  }
}

function parseParams(input) {
  if (!input) throw new ClientError('USAGE_ERROR', '缺少 params_json 或 @params_file');
  const raw = input.startsWith('@')
    ? readFileSync(resolve(process.cwd(), input.slice(1)), 'utf8')
    : input;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ClientError('INVALID_PARAMS_JSON', '工具参数不是合法 JSON', { cause: error.message });
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new ClientError('INVALID_PARAMS_JSON', '工具参数必须是 JSON 对象');
  }
  return parsed;
}

function knownToolNames() {
  try {
    const manifest = readJson(TOOL_MANIFEST_PATH);
    return new Set((manifest.tools || []).map(tool => tool.name));
  } catch {
    return null;
  }
}

async function commandProbe(serverType) {
  return withClient(serverType, async (_client, initialized, config) => ({
    ok: true,
    command: 'probe',
    server_type: serverType,
    transport: config.transport,
    initialized,
  }));
}

async function commandListTools(serverType, sync = false) {
  return withClient(serverType, async (client, initialized) => {
    const result = await client.request('tools/list', {});
    const output = {
      schema_version: 1,
      server_type: serverType,
      server_info: initialized?.serverInfo || null,
      protocol_version: initialized?.protocolVersion || null,
      tools: result?.tools || [],
    };
    if (sync) writeFileSync(TOOL_MANIFEST_PATH, JSON.stringify(output, null, 2) + '\n');
    return { ok: true, command: sync ? 'sync-manifest' : 'list-tools', ...output };
  });
}

async function commandCall(serverType, toolName, paramsInput) {
  if (!toolName) throw new ClientError('USAGE_ERROR', '缺少 tool_name');
  const known = knownToolNames();
  if (known && !known.has(toolName)) {
    throw new ClientError('ROUTE_ERROR', `工具不在本地清单中：${toolName}`, {
      hint: '先运行 sync-manifest 更新工具清单',
    });
  }
  if (SENSITIVE_TOOLS.has(toolName) && process.env.WEALTH_ALLOW_SENSITIVE_TOOLS !== '1') {
    throw new ClientError('SENSITIVE_TOOL_BLOCKED', `个性化工具默认禁用：${toolName}`, {
      required: '确认用户授权后设置 WEALTH_ALLOW_SENSITIVE_TOOLS=1',
    });
  }
  const args = parseParams(paramsInput);
  return withClient(serverType, async client => {
    const result = await client.request('tools/call', { name: toolName, arguments: args });
    if (result?.isError) {
      throw new ClientError('TOOL_ERROR', `工具返回 isError=true：${toolName}`, result);
    }
    return { ok: true, command: 'call', server_type: serverType, tool_name: toolName, result };
  });
}

function usage() {
  return [
    'wealth-mcp-skill client',
    '',
    '用法：',
    '  node scripts/client.mjs probe <server_type>',
    '  node scripts/client.mjs list-tools <server_type>',
    '  node scripts/client.mjs sync-manifest <server_type>',
    "  node scripts/client.mjs call <server_type> <tool_name> '<params_json>|@params_file'",
  ].join('\n');
}

function print(value, stream = process.stdout) {
  stream.write(JSON.stringify(value, null, 2) + '\n');
}

async function main() {
  const [command, serverType = 'wealth-ai-gateway', toolName, paramsInput] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(usage() + '\n');
    return;
  }
  let result;
  if (command === 'probe') result = await commandProbe(serverType);
  else if (command === 'list-tools') result = await commandListTools(serverType, false);
  else if (command === 'sync-manifest') result = await commandListTools(serverType, true);
  else if (command === 'call') result = await commandCall(serverType, toolName, paramsInput);
  else throw new ClientError('USAGE_ERROR', `未知命令：${command}`, { usage: usage() });
  print(result);
}

main().catch(error => {
  const known = error instanceof ClientError;
  print({
    ok: false,
    error: {
      code: known ? error.code : 'UNEXPECTED_ERROR',
      message: error.message || String(error),
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  }, process.stderr);
  process.exitCode = 1;
});
