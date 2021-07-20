import { Transaction, Hash, OutPoint, Script, HexNumber, ChainInfo, Output, HexString } from '@ckb-lumos/base';
import { Bytes } from '@ckb-lumos/base/lib/core';

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
  sign(tx: Transaction): Promise<Transaction>;
  // work with witness
  signMessage?(bytes: Bytes): Promise<Bytes>;
}

export interface TransactionBuilder {
  build(): Promise<Transaction>;
}

export type AddressLike = string | Script;

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
  collectCkbLiveCell(lock: AddressLike, capacity: HexNumber): Promise<ResolvedOutpoint[]>;
  sendTransaction(tx: Transaction): Promise<Hash>;
}
