import { Address, utils } from '@ckb-lumos/base';
import { SearchKey } from '@ckitjs/mercury-client';
import { Amount, Builder, RawTransaction, Transaction } from '@lay2/pw-core';
import { CkbTypeScript, CkitProvider } from '..';
import { Pw } from '../helpers/pw';
import {
  byteLenOfHexData,
  byteLenOfLockOnlyCell,
  ejectExtraCapacity,
  mergeLockOnlyCells,
  mergeSudtCells,
} from './builder-utils';
import { AbstractPwSenderBuilder } from './pw/AbstractPwSenderBuilder';

export interface ChequeClaimOptions {
  // cheque sender, NOT the transaction sender
  sender: Address;
  // cheque receiver
  receiver: Address;
  sudt: CkbTypeScript;
}

export class ChequeClaimBuilder extends AbstractPwSenderBuilder {
  constructor(private options: ChequeClaimOptions, provider: CkitProvider) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const { sender, receiver, sudt } = this.options;

    const senderLock = this.provider.parseToScript(sender);
    const receiverLock = this.provider.parseToScript(receiver);

    const searchKey: SearchKey = {
      script: this.provider.newScript(
        'CHEQUE',
        `0x${utils.computeScriptHash(receiverLock).slice(2, 42)}${utils.computeScriptHash(senderLock).slice(2, 42)}`,
      ),
      ...(sudt ? { filter: { script: sudt } } : {}),
      script_type: 'lock',
    };
    const unclaimedCells = await this.provider.collectCells(
      { searchKey },
      // claim up to 1000 cells at a time
      (cells) => cells.length <= 1000,
    );

    const [claimedSudtCell] = ejectExtraCapacity({
      cell: mergeSudtCells({ cells: unclaimedCells, lock: receiverLock }),
      lock: receiverLock,
    });

    const claimedEmptyChequeCell = unclaimedCells.map((cell) => ({
      ...cell,
      cell_output: { ...cell.cell_output, type: undefined, lock: senderLock },
      data: '0x',
    }));

    const inputCapacityCells = await this.provider.collectLockOnlyCells(
      receiverLock,
      new Amount(claimedSudtCell.cell_output.capacity, 0)
        // additional 1 ckb for tx fee, not all 1ckb will be paid,
        // but the real fee will be calculated based on feeRate
        .add(new Amount('1'))
        .add(new Amount(byteLenOfLockOnlyCell(byteLenOfHexData(receiverLock.args)).toString()))
        .toHexString(),
    );

    const changeCell = Pw.toPwCell(mergeLockOnlyCells(inputCapacityCells));

    const tx = new Transaction(
      new RawTransaction(
        [...inputCapacityCells.map(Pw.toPwCell), ...unclaimedCells.map(Pw.toPwCell)],
        [...claimedEmptyChequeCell.map(Pw.toPwCell), Pw.toPwCell(claimedSudtCell), changeCell],

        await this.getCellDepsByCells(
          [...inputCapacityCells.map(Pw.toPwCell), ...unclaimedCells.map(Pw.toPwCell)],
          [...claimedEmptyChequeCell.map(Pw.toPwCell), Pw.toPwCell(claimedSudtCell), changeCell],
        ),
      ),
      [this.getWitnessPlaceholder(receiver)],
    );

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    changeCell.capacity = changeCell.capacity.sub(Pw.toPwCell(claimedSudtCell).capacity).sub(fee);

    return tx;
  }
}
