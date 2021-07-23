import { Client, HTTPTransport, RequestManager } from '@open-rpc/client-js';

export class MercuryClient {
  private client: Client;

  constructor(uri = 'http://127.0.0.1:5000/api') {
    const transport = new HTTPTransport(uri, { headers: { 'content-type': 'application/json' } });
    this.client = new Client(new RequestManager([transport]));
  }
}
