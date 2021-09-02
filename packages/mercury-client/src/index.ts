import { Hash, HexNumber, HexString, OutPoint, Output, Script } from '@ckb-lumos/base';
import { Client, HTTPTransport, RequestManager } from '@open-rpc/client-js';

export interface SearchKey {
  script: Script;
  script_type: 'lock' | 'type';
  filter?: {
    script?: Script;
    block_range?: [HexNumber, HexNumber];
    output_capacity_range?: [HexNumber, HexNumber];
    output_data_len_range?: [HexNumber, HexNumber];
  };
}

export interface GetCellsPayload {
  search_key: SearchKey;
  order?: 'asc' | 'desc';
  limit?: HexNumber;
  after_cursor?: HexString;
}

export interface ResolvedOutpoint {
  block_number: HexNumber;
  out_point: OutPoint;
  output: Output;
  output_data: HexString;
  tx_index: HexNumber;
}

interface GetPayloadResponse {
  last_cursor: HexString;
  objects: ResolvedOutpoint[];
}

export interface GetTipResponse {
  block_hash: Hash;
  block_number: HexNumber;
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

  get_tip(): Promise<GetTipResponse> {
    return this.client.request({ method: 'get_tip' });
  }
}
