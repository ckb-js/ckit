import { Address, HexNumber, Transaction, CellDep, utils, Cell } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { sealTransaction, TransactionSkeleton, TransactionSkeletonType } from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder, CkbTypeScript } from '@ckit/base';
import { toBigUInt128LE } from '@lay2/pw-core';
import { CkitConfig, CkitProvider } from '../providers';
import { nonNullable, asserts } from '../utils';

const TRANFER_FEE = BigInt(1000);

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class AcpTransferSudtBuilder implements TransactionBuilder {
  secp256k1Dep: CellDep;
  sudtTypeDep: CellDep;

  constructor(private options: TransferOptions, private provider: CkitProvider, private signer: Signer) {
    this.sudtTypeDep = this.getCellDeps('SUDT');
    this.secp256k1Dep = this.getCellDeps('SECP256K1_BLAKE160');
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

  updateOutputSudt(
    txSkeleton: TransactionSkeletonType,
    address: Address,
    amount: bigint,
    capacity: HexNumber,
  ): TransactionSkeletonType {
    const outputSudtCell = <Cell>{
      cell_output: {
        lock: this.provider.parseToScript(address),
        type: this.options.sudt,
        capacity: capacity,
      },
      data: utils.toBigUInt128LE(BigInt(amount)),
    };
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.push(outputSudtCell);
    });
    return txSkeleton;
  }

  updateCellDeps(txSkeleton: TransactionSkeletonType): TransactionSkeletonType {
    // TODO replace acpLockDep with unipass lock before publishing
    // TODO automatically fill cellDep by from lockscript
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.sudtTypeDep).push(this.secp256k1Dep);
    });
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider.asIndexerCellProvider() });

    const fromAddress = await this.signer.getAddress();

    const signerInputCells = await this.provider.collectUdtCells(fromAddress, this.options.sudt, this.options.amount);
    const recipientInputCells = await this.provider.collectUdtCells(this.options.recipient, this.options.sudt, '0');
    asserts(signerInputCells.length === 1, `signer input count invalid, expect 1, actual ${signerInputCells.length}`);
    asserts(
      recipientInputCells.length === 1,
      `recipient input count invalid, expect 1, actual ${recipientInputCells.length}`,
    );

    const signerCell = <Cell>{
      cell_output: signerInputCells[0]?.output,
      data: signerInputCells[0]?.output_data,
      out_point: signerInputCells[0]?.out_point,
    };
    txSkeleton = await common.setupInputCell(txSkeleton, signerCell, fromAddress, { config: this.provider.config });

    txSkeleton = txSkeleton.update('inputs', (inputs) => {
      return inputs.push(
        ...recipientInputCells.map((c) => {
          return <Cell>{
            cell_output: c.output,
            data: c.output_data,
            out_point: c.out_point,
            block_number: c.block_number,
          };
        }),
      );
    });

    // update signer output cell
    const signerOutputCell = nonNullable(txSkeleton.get('outputs').get(0));
    const signerInputCellsSudtAmount = BigInt(toBigUInt128LE(signerOutputCell.data.slice(0, 34)));
    const changeSudtAmount = signerInputCellsSudtAmount - BigInt(this.options.amount);
    if (changeSudtAmount >= 0) {
      txSkeleton = txSkeleton.update('outputs', (outputs) => {
        return outputs.clear().push(<Cell>{
          cell_output: {
            lock: signerOutputCell.cell_output.lock,
            type: this.options.sudt,
            capacity: `0x${(BigInt(signerOutputCell.cell_output.capacity) - TRANFER_FEE).toString(16)}`,
          },
          data: utils.toBigUInt128LE(BigInt(changeSudtAmount)),
        });
      });
    } else {
      throw new Error('signer sudt balance not enough');
    }

    // update recipient output cell
    const recipientInputCellsSudtAmount = recipientInputCells
      .map((c) => BigInt(toBigUInt128LE(c.output_data.slice(0, 34))))
      .reduce((a, b) => a + b, BigInt(0));

    txSkeleton = this.updateOutputSudt(
      txSkeleton,
      this.options.recipient,
      recipientInputCellsSudtAmount + BigInt(this.options.amount),
      nonNullable(recipientInputCells[0]).output.capacity,
    );

    txSkeleton = this.updateCellDeps(txSkeleton);
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });

    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
