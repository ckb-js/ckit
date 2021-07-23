import { Script, Hash } from '@ckb-lumos/base';
import { RequestManager, HTTPTransport, Client } from '@open-rpc/client-js';

interface ListChainsResponse {
  id: number;
  name: string;
  chain_type: string;
  is_active: boolean;
}

interface CreateChainPayload {
  assembler_lock_arg: string;
  genesis_issued_cells: { capacity: string; lock: Script }[];
}

interface CreateChainResponse {
  id: number;
  name: string;
}

export class TippyClient {
  private client: Client;

  constructor(uri = 'http://127.0.0.1:5000/api') {
    const transport = new HTTPTransport(uri, { headers: { 'content-type': 'application/json' } });
    this.client = new Client(new RequestManager([transport]));
  }

  list_chains(): Promise<ListChainsResponse> {
    return this.client.request({ method: 'list_chains', params: [] });
  }

  delete_chain(id: number): Promise<'ok'> {
    return this.client.request({ method: 'delete_chain', params: [id] });
  }

  create_chain(params?: CreateChainPayload): Promise<CreateChainResponse> {
    return this.client.request({ method: 'create_chain', params: params ? [params] : [] });
  }

  set_active_chain(id: number): Promise<'ok'> {
    return this.client.request({ method: 'set_active_chain', params: [id] });
  }

  start_chain(): Promise<'ok'> {
    return this.client.request({ method: 'start_chain', params: [] });
  }

  stop_chain(): Promise<'ok'> {
    return this.client.request({ method: 'stop_chain', params: [] });
  }

  start_miner(): Promise<'ok'> {
    return this.client.request({ method: 'start_miner', params: [] });
  }

  stop_miner(): Promise<'ok'> {
    return this.client.request({ method: 'stop_miner', params: [] });
  }

  /**
   * Mine number_of_blocks blocks at the interval of 1 second.
   * @param num
   */
  mine_blocks(num: number): Promise<'Wait for blocks to be mined.'> {
    return this.client.request({ method: 'mine_blocks', params: [num] });
  }

  /**
   * revert blocks
   * @param num
   */
  revert_blocks(num: number): Promise<'Reverted blocks.'> {
    return this.client.request({ method: 'revert_blocks', params: [num] });
  }

  ban_transaction(txHash: Hash, type: 'proposed' | 'commit'): Promise<'Added to denylist.'> {
    return this.client.request({
      method: 'ban_transaction',
      params: [txHash, type],
    });
  }

  unban_transaction(txHash: Hash, type: 'proposed' | 'commit'): Promise<'Removed from denylist.'> {
    return this.client.request({
      method: 'unban_transaction',
      params: [txHash, type],
    });
  }
}
