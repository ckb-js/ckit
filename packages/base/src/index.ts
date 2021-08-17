import {
  Transaction,
  Hash,
  OutPoint,
  HexNumber,
  ChainInfo,
  Output,
  HexString,
  Script,
  Address,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Cell,
} from '@ckb-lumos/base';

export type ConnectStatus = 'disconnected' | 'connecting' | 'connected';

export interface WalletEventListener {
  (event: 'connectStatusChanged', listener: (status: ConnectStatus) => void): void;
  (event: 'signerChanged', listener: (signer: EntrySigner) => void): void;
  (event: 'error', listener: (error?: unknown) => void): void;
}

export type BuiltinFeatures = 'issue-sudt' | 'acp';
export type WalletFeature = BuiltinFeatures | string;

export interface WalletDescriptor {
  readonly name: string;
  readonly description: string;
  readonly features: WalletFeature[];
}

export interface WalletConnector {
  connect(): void;
  disconnect(): void;
  on: WalletEventListener;
}

export interface EntrySigner<TX = unknown> {
  getAddress(): Promise<string>;
  seal(obj: TX): Promise<Transaction>;
}

export interface TransactionBuilder {
  build(): Promise<Transaction>;
}

export type CkbTypeScript = Script;

/**
 * @deprecated migrate to {@link Cell}
 */
export type ResolvedOutpoint = {
  block_number: HexNumber;
  out_point: OutPoint;
  output: Output;
  output_data: HexString;
  tx_index: HexNumber;
};

export interface Provider {
  /**
   * check a node is mainnet or testnet
   */
  getChainInfo(): Promise<ChainInfo>;

  /**
   * collect free capacity
   * @param lock
   * @param capacity
   */
  collectCkbLiveCells(lock: Address, capacity: HexNumber): Promise<ResolvedOutpoint[]>;

  /**
   * send a signed transaction to a ckb node
   * @param tx
   */
  sendTransaction(tx: Transaction): Promise<Hash>;

  /**
   * parse a lock script to an address
   * @param script
   * @see https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0021-ckb-address-format/0021-ckb-address-format.md
   */
  parseToAddress(script: Script): string;
}

export { ScriptManager } from './ScriptManager';
export { AbstractProvider, ProviderConfig, InitOptions } from './AbstractProvider';
export { AbstractWallet } from './AbstractWallet';
