import { Address, HexNumber, Transaction, CellDep, Script, utils, Cell } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { minimalCellCapacity, sealTransaction, TransactionSkeleton, TransactionSkeletonType } from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder } from '@ckit/base';
import { CkitConfig, CkitProvider } from '../providers';
import { nonNullable } from '../utils';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp'
  // find the recipient's ACP cell, and if not find it, create a new ACP for the recipient
  | 'findOrCreateAcp';

export type RecipientOptions = {
  recipient: Address;
  amount: HexNumber;
  /**
   * additional transfer CKBytes
   */
  additionalCapacity?: HexNumber;
  /**
   * defaults to findAcp
   */
  capacityPolicy?: CapacityPolicy;
};

export interface MintOptions {
  recipients: RecipientOptions[];
}

/**
 * @deprecated
 */
export class MintSudtBuilder implements TransactionBuilder {
  public static SUDT_CELL_MINIMAL_CAPACITY =
    // prettier-ignore
    8  /* capacity: u64 */ +
    /* lock script */
    32 /* code_hash: U256 */ +
    20 /* lock_args: blake160 */ +
    1  /* hash_type: u8 */ +
    /* type script */
    32 /* code_hash: U256 */ +
    32 /* args: U256, issuer lock hash */ +
    1 /* hash_type: u8 */ +
    /* output_data */
    16; /* data: u128, amount, little-endian */

  sudtTypeDep: CellDep;
  pwLockDep: CellDep;
  acpLockDep: CellDep;

  constructor(private options: MintOptions, private provider: CkitProvider, private signer: Signer) {
    this.sudtTypeDep = this.getCellDeps('SUDT');
    this.pwLockDep = this.getCellDeps('PW_NON_ANYONE_CAN_PAY');
    this.acpLockDep = this.getCellDeps('ANYONE_CAN_PAY');
  }

  getCellDeps(scriptKey: keyof CkitConfig['SCRIPTS']): CellDep {
    const scriptConfig = this.provider.getScriptConfig(scriptKey);
    if (scriptConfig === undefined) {
      throw new Error(`${scriptKey} not defined in mercury provider`);
    }
    return {
      out_point: {
        tx_hash: scriptConfig.TX_HASH,
        index: scriptConfig.INDEX,
      },
      dep_type: scriptConfig.DEP_TYPE,
    };
  }

  getScript(scriptKey: keyof CkitConfig['SCRIPTS']): Script {
    const scriptConfig = this.provider.getScriptConfig(scriptKey);
    if (scriptConfig === undefined) {
      throw new Error(`${scriptKey} not defined in mercury provider`);
    }
    return {
      code_hash: scriptConfig.CODE_HASH,
      hash_type: scriptConfig.HASH_TYPE,
      args: '0x',
    };
  }

  async handlerRecipient(
    txSkeleton: TransactionSkeletonType,
    recipientInfo: RecipientOptions,
    sudtTypeScript: Script,
  ): Promise<TransactionSkeletonType> {
    switch (recipientInfo.capacityPolicy) {
      case 'createAcp': {
        const sudtOutputCell = <Cell>{
          cell_output: {
            lock: this.provider.parseToScript(recipientInfo.recipient),
            type: sudtTypeScript,
            capacity: `0x0`,
          },
          data: utils.toBigUInt128LE(BigInt(recipientInfo.amount)),
        };
        const sudtCapacity = minimalCellCapacity(sudtOutputCell);
        sudtOutputCell.cell_output.capacity = `0x${sudtCapacity.toString(16)}`;
        txSkeleton = txSkeleton.update('outputs', (outputs) => {
          return outputs.push(sudtOutputCell);
        });
        return txSkeleton;
      }
      default:
        throw new Error('unexpected capacity policy');
    }
  }

  async completeTx(
    txSkeleton: TransactionSkeletonType,
    fromAddress: string,
    feeRate = BigInt(10000),
  ): Promise<TransactionSkeletonType> {
    const inputCapacity = txSkeleton
      .get('inputs')
      .map((c) => BigInt(c.cell_output.capacity))
      .reduce((a, b) => a + b, BigInt(0));
    const outputCapacity = txSkeleton
      .get('outputs')
      .map((c) => BigInt(c.cell_output.capacity))
      .reduce((a, b) => a + b, BigInt(0));
    const needCapacity = outputCapacity - inputCapacity + BigInt(10) ** BigInt(8);
    txSkeleton = await common.injectCapacity(txSkeleton, [fromAddress], needCapacity, undefined, undefined, {
      enableDeductCapacity: false,
      config: this.provider.config,
    });
    txSkeleton = await common.payFeeByFeeRate(txSkeleton, [fromAddress], feeRate, undefined, {
      config: this.provider.config,
    });
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider.asIndexerCellProvider() });

    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.sudtTypeDep);
    });
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.pwLockDep);
    });
    // TODO replace it with unipass lock before publishing
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.acpLockDep);
    });

    const fromAddress = await this.signer.getAddress();
    const fromLockScript = this.provider.parseToScript(fromAddress);
    const fromLockScriptHash = utils.computeScriptHash(fromLockScript);
    const sudtType = this.getScript('SUDT');
    sudtType.args = fromLockScriptHash;

    for (const recipientInfo of this.options.recipients) {
      txSkeleton = await this.handlerRecipient(txSkeleton, recipientInfo, sudtType);
    }

    txSkeleton = await this.completeTx(txSkeleton, fromAddress);
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });
    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
