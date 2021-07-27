import { Tip } from '@ckb-lumos/base';
import { Client, HTTPTransport, RequestManager } from '@open-rpc/client-js';

export class MercuryClient {
  private client: Client;

  constructor(uri = 'http://127.0.0.1:5000/api') {
    const transport = new HTTPTransport(uri, { headers: { 'content-type': 'application/json' } });
    this.client = new Client(new RequestManager([transport]));
  }

  public async getTip(): Promise<Tip> {
    const res = await this.client.request({ method: 'get_tip' });
    return res as Tip;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  public async getCells(params: any): Promise<any> {
    return await this.client.request({ method: 'get_cells', params: params });
  }
}
