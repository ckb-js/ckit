import { Address, HexNumber, Transaction, CellDep, Script, utils, Cell } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import {
  minimalCellCapacity,
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
} from '@ckb-lumos/helpers';
import { Signer, TransactionBuilder } from '@ckit/base';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

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
  sudtTypeDep: CellDep;
  pwLockDep: CellDep;
  acpLockDep: CellDep;
  constructor(private options: MintOptions, private provider: MercuryProvider, private signer: Signer) {
    this.sudtTypeDep = this.getCellDeps('sudtType');
    this.pwLockDep = this.getCellDeps('pwLock');
    this.acpLockDep = this.getCellDeps('acpLock');
  }

  getCellDeps(scriptKey: string): CellDep {
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

  getScript(scriptKey: string): Script {
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
            lock: parseAddress(recipientInfo.recipient),
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
    });
    txSkeleton = await common.payFeeByFeeRate(txSkeleton, [fromAddress], feeRate);
    return txSkeleton;
  }

  async build(): Promise<Transaction> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.provider });

    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.sudtTypeDep);
    });
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.pwLockDep);
    });
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push(this.acpLockDep);
    });

    const fromAddress = await this.signer.getAddress();
    const fromLockScript = parseAddress(fromAddress);
    const fromLockScriptHash = utils.computeScriptHash(fromLockScript);
    const sudtType = this.getScript('sudtType');
    sudtType.args = fromLockScriptHash;

    for (const recipietInfo of this.options.recipients) {
      txSkeleton = await this.handlerRecipient(txSkeleton, recipietInfo, sudtType);
    }

    txSkeleton = await this.completeTx(txSkeleton, fromAddress);
    txSkeleton = common.prepareSigningEntries(txSkeleton);
    const sign = await this.signer.signMessage(txSkeleton.get('signingEntries').get(0)!.message);
    return sealTransaction(txSkeleton, [sign]);
  }

  // async build(): Promise<Transaction> {
  //   const deps = [this.getCellDeps('sudtType'), this.getCellDeps('pwLock'), this.getCellDeps('acpLock')];

  //   const from = await this.signer.getAddress();
  //   const fromLockScript = parseAddress(from);
  //   const fromLockScriptHash = utils.computeScriptHash(fromLockScript);
  //   const sudtType = this.getScript('sudtType');
  //   sudtType.args = fromLockScriptHash;

  //   const inputCells = new Array<Cell>();
  //   const outputs = new Array<Output>();
  //   const outputsData = new Array<HexString>();
  //   for (const recipietInfo of this.options.recipients) {
  //     switch (recipietInfo.capacityPolicy) {
  //       case 'createAcp': {
  //         const output = {
  //           lock: this.generateACPLockFromAddress(recipietInfo.recipient),
  //           type: sudtType,
  //           capacity: `0x0`,
  //         };
  //         const data = utils.toBigUInt128LE(BigInt(recipietInfo.amount));
  //         const sudtCapacity = minimalCellCapacity({ cell_output: output, data: data });
  //         output.capacity = `0x${sudtCapacity.toString(16)}`;
  //         outputs.push(output);
  //         outputsData.push(utils.toBigUInt128LE(BigInt(recipietInfo.amount)));
  //         break;
  //       }
  //       default:
  //         throw new Error('unexpected capacity policy');
  //     }
  //   }

  //   const inputsCapacity = inputCells.map((cell) => BigInt(cell.cell_output.capacity)).reduce((a, b) => a + b);
  //   const outputsCapacity = outputs.map((output) => BigInt(output.capacity)).reduce((a, b) => a + b);
  //   const fee = BigInt(1000000);
  //   const needSupplyCapacity = outputsCapacity - inputsCapacity - fee;

  //   // const fromSuppliedCell = await this.provider.collectCkbLiveCell(from, `0x${needSupplyCapacity.toString(16)}`);
  //   // inputCells.push(...fromSuppliedCell);

  //   const inputs = inputCells.map((cell) => {
  //     if (cell.out_point === undefined) {
  //       throw new Error(`${cell} out_point is undefined`);
  //     }
  //     return {
  //       previous_output: {
  //         tx_hash: cell.out_point.tx_hash,
  //         index: cell.out_point.index,
  //       },
  //       since: '0x0',
  //     };
  //   });

  //   const suppliedCapacity = inputCells.map((cell) => BigInt(cell.cell_output.capacity)).reduce((a, b) => a + b);
  //   if (suppliedCapacity < needSupplyCapacity) {
  //     throw new Error(`${from} balance not enough`);
  //   }
  //   const changeOutput = {
  //     lock: fromLockScript,
  //     capacity: `0x${(suppliedCapacity - outputsCapacity - fee).toString(16)}`,
  //   };
  //   outputs.push(changeOutput);
  //   outputsData.push('0x');

  //   return {
  //     version: '0x0',
  //     cell_deps: deps,
  //     header_deps: [],
  //     inputs: inputs,
  //     outputs: outputs,
  //     outputs_data: outputsData,
  //     witnesses: [],
  //   };
  // }
}
