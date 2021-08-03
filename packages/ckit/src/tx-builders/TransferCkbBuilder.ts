import { Address, HexNumber, Transaction, CellDep } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { sealTransaction, TransactionSkeleton, TransactionSkeletonType } from '@ckb-lumos/helpers';

import { Signer, TransactionBuilder } from '@ckit/base';
import { CkitConfig, CkitProvider } from '../providers';
import { unimplemented, nonNullable } from '../utils';

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
  constructor(private options: TransferCkbOptions, private provider: CkitProvider, private signer: Signer) {}

  async handlerRecipient(
    txSkeleton: TransactionSkeletonType,
    recipientInfo: RecipientOption,
  ): Promise<TransactionSkeletonType> {
    switch (recipientInfo.capacityPolicy) {
      case 'createAcp':
        txSkeleton = txSkeleton.update('outputs', (outputs) => {
          return outputs.push({
            cell_output: {
              lock: this.provider.parseToScript(recipientInfo.recipient),
              capacity: `0x${BigInt(recipientInfo.amount).toString(16)}`,
            },
            data: '0x',
          });
        });
        break;
      default:
        unimplemented();
    }
    return txSkeleton;
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

    const fromAddress = await this.signer.getAddress();

    for (const recipientInfo of this.options.recipients) {
      txSkeleton = await this.handlerRecipient(txSkeleton, recipientInfo);
    }
    txSkeleton = await this.completeTx(txSkeleton, fromAddress);
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });
    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
