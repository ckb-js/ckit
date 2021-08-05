// just for testing case, do not use it
import { Address, HexNumber, Transaction, CellDep, Cell, core } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import {
  createTransactionFromSkeleton,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
} from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder } from '@ckit/base';
import { normalizers } from '@lay2/pw-core';
import { CkitConfig, CkitProvider } from '../../providers';
import { nonNullable, asserts, boom } from '../../utils';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp'
  // find the recipient's ACP cell, and if not find it, create a new ACP for the recipient
  | 'findOrCreateAcp';

export interface TransferCkbOptions {
  recipients: RecipientOption[];
}

interface RecipientOption {
  amount: HexNumber;
  recipient: Address;
  /**
   * defaults to findAcp
   */
  capacityPolicy?: CapacityPolicy;
}

export class TransferCkbBuilder implements TransactionBuilder {
  secp256k1Dep: CellDep;
  sudtTypeDep: CellDep;

  constructor(private options: TransferCkbOptions, private provider: CkitProvider, private signer: Signer) {
    this.sudtTypeDep = this.getCellDeps('SUDT');
    this.secp256k1Dep = this.getCellDeps('SECP256K1_BLAKE160');
  }

  private static getTransactionSize(txSkeleton: TransactionSkeletonType): number {
    const tx = createTransactionFromSkeleton(txSkeleton);
    const serializedTx = core.SerializeTransaction(normalizers.NormalizeTransaction(tx));

    // 4 is serialized offset bytesize
    return serializedTx.byteLength + 4;
  }

  private getFee(txSkeleton: TransactionSkeletonType) {
    return (
      (BigInt(this.provider.config.MIN_FEE_RATE) / 1000n) * BigInt(TransferCkbBuilder.getTransactionSize(txSkeleton))
    );
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

  updateCellDeps(txSkeleton: TransactionSkeletonType): TransactionSkeletonType {
    // TODO replace acpLockDep with unipass lock before publishing
    // TODO automatically fill cellDep by from lockscript
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.provider.getCellDep('PW_NON_ANYONE_CAN_PAY'));
    });
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    if (this.options.recipients.some((options) => options.capacityPolicy !== 'createAcp')) {
      boom('Now only createAcp policy is supported');
    }

    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider.asIndexerCellProvider() });

    const fromAddress = await this.signer.getAddress();
    const sumOfTransferAmount = this.options.recipients
      .reduce((sum, recipient) => sum + BigInt(recipient.amount), 0n)
      .toString();

    const signerInputCells = await this.provider.collectCkbLiveCells(fromAddress, sumOfTransferAmount);
    asserts(
      signerInputCells.length === 1 && signerInputCells[0] != null,
      `signer input count invalid, expect 1, actual ${signerInputCells.length}`,
    );

    const signerCell = {
      cell_output: signerInputCells[0].output,
      data: signerInputCells[0].output_data,
      out_point: signerInputCells[0].out_point,
    };
    txSkeleton = await common.setupInputCell(txSkeleton, signerCell, fromAddress, { config: this.provider.config });

    // update signer output cell
    const signerOutputCell = nonNullable(txSkeleton.get('outputs').get(0));
    const signerInputCapacity = BigInt(signerOutputCell.cell_output.capacity);
    const changeCapacity = signerInputCapacity - BigInt(sumOfTransferAmount);

    if (changeCapacity <= 0) {
      boom(`Signer ${fromAddress} is not enough, expected: ${sumOfTransferAmount}, actual: ${signerInputCapacity}`);
    }

    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      const recipientOutputCells = this.options.recipients.map<Cell>((item) => ({
        cell_output: {
          lock: this.provider.parseToScript(item.recipient),
          capacity: `0x${BigInt(item.amount).toString(16)}`,
        },
        data: '0x',
      }));

      return outputs.push(...recipientOutputCells);
    });

    txSkeleton = this.updateCellDeps(txSkeleton);
    txSkeleton.update('outputs', (outputs) => {
      return outputs.update(0, (output) => {
        asserts(output?.cell_output?.capacity != null);
        const txFee = this.getFee(txSkeleton);
        output.cell_output.capacity = String('0x' + (BigInt(changeCapacity) - BigInt(txFee)).toString(16));
        return output;
      });
    });
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });

    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
