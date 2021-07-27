import { HexNumber, HexString, Script } from '@ckb-lumos/base';
import { ResolvedOutpoint } from '@ckit/base';
import { Client, HTTPTransport, RequestManager } from '@open-rpc/client-js';

export interface SearchKey {
  script: Script;
  script_type: 'lock' | 'type';
  filter?: { script?: Script; block_range?: [HexNumber, HexNumber] };
}

export interface GetCellsPayload {
  search_key: SearchKey;
  order?: 'asc' | 'desc';
  limit?: HexNumber;
  after_cursor?: HexString;
}

interface GetPayloadResponse {
  last_cursor: HexString;
  objects: ResolvedOutpoint[];
}

export class MercuryClient {
  private client: Client;

  constructor(uri: string) {
    const transport = new HTTPTransport(uri, { headers: { 'content-type': 'application/json' } });
    this.client = new Client(new RequestManager([transport]));
  }

  get_cells(payload: GetCellsPayload): Promise<GetPayloadResponse> {
    const { search_key, order = 'asc', limit = '0x3e8' /*1_000*/, after_cursor } = payload;
    return this.client.request({
      method: 'get_cells',
      params: [search_key, order, limit, after_cursor],
    });
  }
}
