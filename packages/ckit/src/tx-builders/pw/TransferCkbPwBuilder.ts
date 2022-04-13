import { Address } from '@ckb-lumos/base';
import { Amount, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { NoAvailableCellError } from '../../errors';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { TransferCkbOptions } from '../TransferCkbBuilder';
import { byteLenOfLockOnlyCell } from '../builder-utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class TransferCkbPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: TransferCkbOptions, provider: CkitProvider, private sender: Address) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const recipientCreatedCells = this.options.recipients
      .filter((item) => item.capacityPolicy === 'createCell')
      .map((item) => new Cell(new Amount(item.amount, 0), Pw.toPwScript(this.provider.parseToScript(item.recipient))));

    const acpOptions = this.options.recipients.filter((item) => item.capacityPolicy === 'findAcp');
    const recipientAcpCells$ = from(acpOptions).pipe(
      mergeMap(async (item) => {
        const resolveds = await this.provider.collectCkbLiveCells(item.recipient, '0');

        const resolved = resolveds[0];
        if (!resolved) throw new NoAvailableCellError({ lock: this.provider.parseToScript(item.recipient) });

        // increase capacity
        const cell = Pw.toPwCell(resolved);
        cell.capacity = cell.capacity.add(new Amount(item.amount, 0));
        return cell;
      }),
      toArray(),
    );
    const recipientAcpCells = await lastValueFrom(recipientAcpCells$);

    const createdCapacity = recipientCreatedCells.reduce(
      (totalCapacity, cell) => totalCapacity.add(cell.capacity),
      Amount.ZERO,
    );
    const injectedAcpCapacity = acpOptions.reduce(
      (totalCapacity, item) => totalCapacity.add(new Amount(item.amount, 0)),
      Amount.ZERO,
    );

    const senderOutpoints = await this.provider.collectCkbLiveCells(
      this.sender,
      injectedAcpCapacity
        .add(createdCapacity)
        // 61 ckb to ensure change cell capacity is enough
        .add(new Amount(String(byteLenOfLockOnlyCell())))
        // additional 1 ckb for tx fee, not all 1ckb will be paid,
        // but the real fee will be calculated based on feeRate
        .add(new Amount('1'))
        .toHexString(),
    );
    const senderCells = senderOutpoints.map(Pw.toPwCell);
    if (!senderCells.length || !senderCells[0]) {
      throw new NoAvailableCellError({ lock: this.provider.parseToScript(this.sender) });
    }

    // accumulate all sender capacity into one cell
    const senderOutput = senderCells[0];
    senderOutput.capacity = senderCells.reduce((acc, cell) => acc.add(cell.capacity), new Amount('0', 0));

    const inputCells = [...senderCells, ...recipientAcpCells];
    const outputs = [senderOutput, ...recipientAcpCells, ...recipientCreatedCells];

    const tx = new Transaction(
      new RawTransaction(inputCells, outputs, await this.getCellDepsByCells(inputCells, outputs)),
      [this.getWitnessPlaceholder(this.sender)],
    );

    const fee = TransferCkbPwBuilder.calcFee(tx);
    senderOutput.capacity = senderOutput.capacity.sub(createdCapacity).sub(injectedAcpCapacity).sub(fee);

    return tx;
  }
}
