export type ConnectStatus = 'disconnected' | 'connecting' | 'connected';

export interface Wallet {
  connect(): void;
  disconnect?(): void;
  on(event: 'connectStatusChanged', listener: (status: ConnectStatus) => void): void;
  on(event: 'signerChanged', listener: (signer: Signer) => void): void;
  on(event: 'error', listener: (error?: unknown) => void): void;
}

export interface Signer {
  getAddress(): Promise<string>;
  sign(tx: unknown): Promise<unknown>;
}
