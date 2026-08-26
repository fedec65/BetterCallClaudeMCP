import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createWorkflowsChServer } from '../workflows-ch.js';

describe('workflows-ch server', () => {
  it('lists exactly the 8 workflow tools', async () => {
    const server = createWorkflowsChServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'smoke-test', version: '0.0.1' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const { tools } = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual([
      'claim_user_id', 'delete_workflow', 'get_workflow', 'list_agents',
      'list_workflows', 'log_run', 'save_workflow', 'validate_pipeline'
    ]);

    await client.close();
    await server.close();
  });

  it('returns isError with a zod message on invalid save_workflow input', async () => {
    const server = createWorkflowsChServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'smoke-test', version: '0.0.1' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const res = await client.callTool({
      name: 'save_workflow',
      arguments: { user_id: 'u', slug: 'BAD SLUG', name: '', description: '', pipeline: [], output_spec: '' }
    });
    expect(res.isError).toBe(true);

    await client.close();
    await server.close();
  });
});
