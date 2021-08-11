import { default as EventEmitter } from 'eventemitter3';
import { ConnectStatus, Signer, WalletConnector, WalletDescriptor, WalletEventListener, WalletFeature } from './';

export abstract class AbstractWallet implements WalletConnector {
  descriptor: WalletDescriptor = { name: 'Unknown Wallet', features: [], description: 'an unknown wallet' };

  // do **NOT** change the value manually
  // use {@link getConnectStatus} instead of
  connectStatus: ConnectStatus = 'disconnected';
  // do **NOT** change the value manually
  // use {@link getSigner} instead of
  signer: Signer | undefined;

  private readonly emitter: EventEmitter;

  protected constructor() {
    this.emitter = new EventEmitter();
  }

  on = ((event: string, listener: (arg: unknown) => void) => {
    this.emitter.on(event as ConnectStatus, listener);
  }) as unknown as WalletEventListener;

  connect(): void {
    this.emitConnectStatusChanged('connecting');
    void this.tryConnect().then(
      (signer) => {
        this.emitConnectStatusChanged('connected');
        this.emitChangedSigner(signer);
      },
      (e) => {
        this.emitError(e);
        this.emitConnectStatusChanged('disconnected');
      },
    );
  }

  disconnect(): void {
    this.emitConnectStatusChanged('disconnected');
    this.emitter.removeAllListeners();
  }

  checkSupported(feature: WalletFeature): boolean {
    return this.descriptor.features.includes(feature);
  }

  getConnectStatus(): ConnectStatus {
    return this.connectStatus;
  }

  getSigner(): Signer | undefined {
    return this.signer;
  }

  protected emitConnectStatusChanged(status: ConnectStatus): void {
    this.connectStatus = status;
    this.emitter.emit('connectStatusChanged', status);
  }

  protected emitChangedSigner(signer: Signer): void {
    this.signer = signer;
    this.emitter.emit('signerChanged', signer);
  }

  protected emitError(error: Error = new Error(`An unknown error occurred in the ${this.descriptor.name}`)): void {
    this.emitter.emit('error', error);
  }

  protected setDescriptor(descriptor: Partial<WalletDescriptor>): void {
    const {
      name = this.descriptor.name,
      features = this.descriptor.features,
      description = this.descriptor.description,
    } = descriptor;
    this.descriptor = { name, features, description };
  }

  protected abstract tryConnect(): Promise<Signer>;
}
