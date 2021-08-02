import { Address, HexNumber, Transaction, CellDep, Script, utils, Cell } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { minimalCellCapacity, sealTransaction, TransactionSkeleton, TransactionSkeletonType } from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder, CkbTypeScript } from '@ckit/base';
import { CkitConfig, CkitProvider } from '../providers';
import { nonNullable } from '../utils';
import { toBigUInt128LE } from '@lay2/pw-core';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class AcpTransferSudtBuilder implements TransactionBuilder {
  secp256k1Dep: CellDep;
  sudtTypeDep: CellDep;
  pwLockDep: CellDep;
  acpLockDep: CellDep;
  constructor(private options: TransferOptions, private provider: CkitProvider, private signer: Signer) {
    this.secp256k1Dep = this.getCellDeps('SECP256K1_BLAKE160');
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

  updateOutputsSudt(txSkeleton: TransactionSkeletonType, recipient: Address, amount: bigint): TransactionSkeletonType {
    const outputSudtCell = <Cell>{
      cell_output: {
        lock: this.provider.parseToScript(recipient),
        type: this.options.sudt,
        capacity: `0x0`,
      },
      data: utils.toBigUInt128LE(amount),
    };
    const sudtCapacity = minimalCellCapacity(outputSudtCell);
    outputSudtCell.cell_output.capacity = `0x${sudtCapacity.toString(16)}`;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.push(outputSudtCell);
    });
    return txSkeleton;
  }

  updateCellDeps(txSkeleton: TransactionSkeletonType): TransactionSkeletonType {
    // TODO replace acpLockDep with unipass lock before publishing
    // TODO automatically fill cellDep by from lockscript
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.clear().push(this.secp256k1Dep).push(this.sudtTypeDep).push(this.pwLockDep).push(this.acpLockDep);
    });
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider.asIndexerCellProvider() });

    const fromAddress = await this.signer.getAddress();
    const fromCells = await this.provider.collectUdtCells(fromAddress, this.options.sudt, this.options.amount);
    console.log('fromCells', fromCells);
    txSkeleton.update('inputs', (inputs) => {
      return inputs.push(
        ...fromCells.map((c) => {
          return <Cell>{
            cell_output: c.output,
            data: c.output_data,
            out_point: c.out_point,
            block_number: c.block_number,
          };
        }),
      );
    });

    this.updateOutputsSudt(txSkeleton, this.options.recipient, BigInt(this.options.amount));

    const inputSudtAmount = fromCells
      .map((c) => BigInt(toBigUInt128LE(c.output_data.slice(0, 34))))
      .reduce((a, b) => a + b, BigInt(0));
    const changeSudtAmount = inputSudtAmount - BigInt(this.options.amount);
    if (changeSudtAmount > 0) {
      this.updateOutputsSudt(txSkeleton, fromAddress, changeSudtAmount);
    }

    txSkeleton = await this.completeTx(txSkeleton, fromAddress);
    txSkeleton = this.updateCellDeps(txSkeleton);
    txSkeleton = common.prepareSigningEntries(txSkeleton, { config: this.provider.config });
    const sign = await this.signer.signMessage(nonNullable(txSkeleton.get('signingEntries').get(0)).message);
    return sealTransaction(txSkeleton, [sign]);
  }
}
