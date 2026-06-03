import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export class McpClientManager {
  private clients = new Map<string, Client>();

  public async connect(serverName: string, config: McpServerConfig): Promise<Client> {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env,
    });

    const client = new Client(
      {
        name: 'gemini-coder-pro',
        version: '0.1.5',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    this.clients.set(serverName, client);

    return client;
  }

  public async getTools(serverName: string) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP Server ${serverName} is not connected.`);

    const response = await client.listTools();
    return response.tools;
  }

  public async callTool(serverName: string, toolName: string, args: Record<string, unknown>) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP Server ${serverName} is not connected.`);

    return await client.callTool({
      name: toolName,
      arguments: args,
    });
  }

  public async disconnectAll() {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (err) {
        console.error(`Failed to close MCP client ${name}:`, err);
      }
    }
    this.clients.clear();
  }
}
