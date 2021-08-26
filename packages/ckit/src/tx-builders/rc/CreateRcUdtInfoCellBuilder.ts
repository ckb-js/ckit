import { Hash, HexString } from '@ckb-lumos/base';
import { Transaction } from '@lay2/pw-core';
import { CkitProvider } from '../../providers';
import { unimplemented } from '../../utils';
import { AbstractTransactionBuilder } from '../AbstractTransactionBuilder';
import { SudtStaticInfo } from './types';

export interface CreateRcUdtInfoCellOptions {
  rcIdentity: HexString;
  sudtInfo: SudtStaticInfo;
}

/**
 * ```yaml
 * Data:
 *  - <1 byte version>
 *  - <16 bytes current supply>
 *  - <16 bytes max supply>
 *  - <32 bytes sUDT script hash>
 *  - info: molecule table
 *  - name: bytes
 *  - symbol: bytes
 *  - decimals: u32
 *  - description: bytes
 * Type: <Info Cell type ID>
 * Lock: <RC Lock Script 1>
 *  code_hash: RC Lock
 *  args: <flag: 1> <Eth pubkey hash> <RC lock flags: 8> <Info Cell Type Script Hash>
 * ```
 */
export class CreateRcUdtInfoCellBuilder extends AbstractTransactionBuilder {
  private builtTransaction: Transaction | undefined = undefined;

  constructor(private options: CreateRcUdtInfoCellOptions, private provider: CkitProvider) {
    super();
  }

  build(): Promise<Transaction> {
    throw new Error('unimplemented');
  }

  /**
   * the type hash is used as udt id
   */
  getTypeHash(): Hash {
    unimplemented();
  }

  getIssuerLockHash(): Hash {
    unimplemented();
  }
}
