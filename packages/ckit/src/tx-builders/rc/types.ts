import { HexNumber, HexString } from '@ckb-lumos/base';

export type RcIdentity = HexString;

export interface SudtStaticInfo {
  name: string;
  symbol: string;
  decimals: number;
  // supply without decimals, the maxSupply MUST large than 10^decimals
  maxSupply: HexNumber;
  description: string;
}
