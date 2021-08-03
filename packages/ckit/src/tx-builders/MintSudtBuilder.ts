import { Address, HexNumber, Transaction, CellDep, Script, utils, Cell } from '@ckb-lumos/base';
import { common, anyoneCanPay } from '@ckb-lumos/common-scripts';
import { sealTransaction, TransactionSkeleton, TransactionSkeletonType } from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder } from '@ckit/base';
import { CkitProvider } from '../providers';
import { nonNullable } from '../utils';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp'
  // find the recipient's ACP cell, and if not find it, create a new ACP for the recipient
  | 'findOrCreateAcp';

type RecipientOptions = {
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

  secp256k1Dep: CellDep;
  sudtTypeDep: CellDep;
  pwLockDep: CellDep;
  acpLockDep: CellDep;

  constructor(private options: MintOptions, private provider: CkitProvider, private signer: Signer) {
    this.secp256k1Dep = this.provider.getCellDep('SECP256K1_BLAKE160');
    this.sudtTypeDep = this.provider.getCellDep('SUDT');
    this.pwLockDep = this.provider.getCellDep('PW_NON_ANYONE_CAN_PAY');
    this.acpLockDep = this.provider.getCellDep('ANYONE_CAN_PAY');
  }

  async handlerRecipient(
    txSkeleton: TransactionSkeletonType,
    recipientInfo: RecipientOptions,
    sudtTypeScript: Script,
  ): Promise<TransactionSkeletonType> {
    let sudtCellCapacity = BigInt(MintSudtBuilder.SUDT_CELL_MINIMAL_CAPACITY) * BigInt(10) ** BigInt(8);
    if (recipientInfo.additionalCapacity) {
      sudtCellCapacity += BigInt(recipientInfo.additionalCapacity);
    }
    switch (recipientInfo.capacityPolicy) {
      case 'createAcp': {
        const sudtOutputCell = <Cell>{
          cell_output: {
            lock: this.provider.parseToScript(recipientInfo.recipient),
            type: sudtTypeScript,
            capacity: `0x${sudtCellCapacity.toString(16)}`,
          },
          data: utils.toBigUInt128LE(BigInt(recipientInfo.amount)),
        };
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

  updateCellDeps(txSkeleton: TransactionSkeletonType): TransactionSkeletonType {
    // TODO replace acpLockDep with unipass lock before publishing
    // TODO automatically fill cellDep by from lockscript
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.sudtTypeDep).push(this.pwLockDep).push(this.acpLockDep);
    });
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider.asIndexerCellProvider() });

    const fromAddress = await this.signer.getAddress();
    const fromLockScript = this.provider.parseToScript(fromAddress);
    const fromLockScriptHash = utils.computeScriptHash(fromLockScript);
    const sudtType = this.provider.newScript('SUDT', fromLockScriptHash);

    for (const recipientInfo of this.options.recipients) {
      txSkeleton = await this.handlerRecipient(txSkeleton, recipientInfo, sudtType);
    }

    const pwLock = this.provider.newScript('PW_NON_ANYONE_CAN_PAY');
    common.registerCustomLockScriptInfos([
      {
        code_hash: pwLock.code_hash,
        hash_type: pwLock.hash_type,
        lockScriptInfo: anyoneCanPay,
      },
    ]);
    txSkeleton = await this.completeTx(txSkeleton, fromAddress);
    txSkeleton = this.updateCellDeps(txSkeleton);
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });

    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
