import { default as EventEmitter } from 'eventemitter3';
import { ConnectStatus, Signer, Wallet, WalletEventListener } from './';

export type WalletEvents = {
  connectStatusChanged: (status: ConnectStatus) => void;
  signerChanged: (signer: Signer) => void;
  error: (error?: unknown) => void;
};

export abstract class AbstractWallet implements Wallet {
  protected connectStatus: ConnectStatus = 'disconnected';
  protected signer: Signer | undefined;
  private readonly emitter: EventEmitter;

  protected constructor() {
    this.emitter = new EventEmitter();
  }

  abstract connect(): void;

  disconnect(): void {
    this.onConnectStatusChanged('disconnected');
    this.emitter.removeAllListeners();
  }

  getConnectStatus(): ConnectStatus {
    return this.connectStatus;
  }

  getSigner(): Signer | undefined {
    return this.signer;
  }

  protected onConnectStatusChanged(status: ConnectStatus): void {
    this.connectStatus = status;
    this.emitter.emit('connectStatusChanged', status);
  }

  protected onSignerChanged(signer: Signer): void {
    this.signer = signer;
    this.emitter.emit('signerChanged', signer);
  }

  protected onSignerDisconnected(): void {
    this.signer = undefined;
  }

  protected onError(error: Error = new Error('An unknown error occurred in the wallet')): void {
    this.emitter.emit('error', error);
  }

  on = ((event: string, listener: (arg: unknown) => void) => {
    this.emitter.on(event as ConnectStatus, listener);
  }) as unknown as WalletEventListener;
}
