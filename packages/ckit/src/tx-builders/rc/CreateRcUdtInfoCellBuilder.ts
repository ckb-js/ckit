import { Hash } from '@ckb-lumos/base';
import { RcIdentity, SudtStaticInfo } from '@ckitjs/rc-lock';
import { invariant } from '@ckitjs/utils';
import { Transaction } from '@lay2/pw-core';
import { CkitProvider } from '../../providers';
import { AbstractTransactionBuilder } from '../AbstractTransactionBuilder';
import { CreateRcUdtInfoCellPwBuilder } from './CreateRcUdtInfoCellPwBuilder';

export interface CreateRcUdtInfoCellOptions {
  rcIdentity: RcIdentity;
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
 *  - decimals: u8
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

  async build(): Promise<Transaction> {
    this.builtTransaction = await new CreateRcUdtInfoCellPwBuilder(this.options, this.provider).build();
    return this.builtTransaction;
  }

  /**
   * the type hash is used as udt id
   */
  getTypeHash(): Hash {
    if (!this.builtTransaction) throw new Error('Transaction is not built yet');
    const rcUdtInfoCell = this.builtTransaction.raw.outputs[0];
    invariant(rcUdtInfoCell && rcUdtInfoCell.type);
    return rcUdtInfoCell.type.toHash();
  }

  getIssuerLockHash(): Hash {
    if (!this.builtTransaction) throw new Error('Transaction is not built yet');
    const rcUdtInfoCell = this.builtTransaction.raw.outputs[0];
    invariant(rcUdtInfoCell && rcUdtInfoCell.type);
    return rcUdtInfoCell.lock.toHash();
  }
}
