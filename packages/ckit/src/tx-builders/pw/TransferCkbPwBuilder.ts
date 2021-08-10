import { Signer } from '@ckit/base';
import { Amount, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { NoAvailableCellError } from '../../errors';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { TransferCkbOptions } from '../TransferCkbBuilder';
import { byteLenOfCkbLiveCell } from '../builder-utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class TransferCkbPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: TransferCkbOptions, provider: CkitProvider, private signer: Signer) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const recipientCreatedCells = this.options.recipients
      .filter((item) => item.capacityPolicy === 'createAcp')
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
      await this.signer.getAddress(),
      injectedAcpCapacity
        .add(createdCapacity)
        // 61 ckb to ensure change cell capacity is enough
        .add(new Amount(String(byteLenOfCkbLiveCell())))
        // additional 1 ckb for tx fee, not all 1ckb will be paid,
        // but the real fee will be calculated based on feeRate
        .add(new Amount('1'))
        .toHexString(),
    );
    const senderCells = senderOutpoints.map(Pw.toPwCell);
    if (!senderCells.length || !senderCells[0]) {
      throw new NoAvailableCellError({ lock: this.provider.parseToScript(await this.signer.getAddress()) });
    }

    const senderOutput = senderCells[0];
    const tx = new Transaction(
      new RawTransaction(
        [...senderCells, ...recipientAcpCells],
        [senderOutput, ...recipientAcpCells, ...recipientCreatedCells],
        // TODO getDeps by all script
        this.getCellDeps(),
      ),
      [this.getWitnessPlaceholder(await this.signer.getAddress())],
    );

    const fee = TransferCkbPwBuilder.calcFee(tx);
    senderOutput.capacity = senderOutput.capacity.sub(createdCapacity).sub(injectedAcpCapacity).sub(fee);

    return tx;
  }
}
