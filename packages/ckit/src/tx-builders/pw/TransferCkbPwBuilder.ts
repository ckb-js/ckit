import { Signer } from '@ckit/base';
import { Amount, AmountUnit, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { boom, nonNullable } from '../../utils';
import { TransferCkbOptions } from '../TransferCkbBuilder';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class ForceSimpleBuilder extends AbstractPwSenderBuilder {
  constructor(private options: TransferCkbOptions, provider: CkitProvider, private signer: Signer) {
    super(provider);
  }

  async build(fee: Amount = Amount.ZERO): Promise<Transaction> {
    const allPolicyCreateAcp = this.options.recipients.every((option) => option.capacityPolicy === 'createAcp');
    if (!allPolicyCreateAcp) boom('Now only createAcp policy is available');

    // eslint-disable-next-line no-debugger
    debugger;
    const address = nonNullable(this.options.recipients[0]?.recipient);
    const amount = new Amount(nonNullable(this.options.recipients[0]?.amount), 0);

    const outputCell = new Cell(amount, Pw.toPwScript(this.provider.parseToScript(address)));
    const neededAmount = amount.add(fee);
    let inputSum = new Amount('0');
    const inputCells: Cell[] = [];

    const cells = await this.provider.collectCkbLiveCells(await this.signer.getAddress(), neededAmount.toHexString());

    cells.forEach((cell) => {
      const currentCell = new Cell(
        new Amount(cell.output.capacity, 0),
        Pw.toPwScript(cell.output.lock),
        undefined,
        Pw.toPwOutPoint(cell.out_point),
      );
      inputCells.push(currentCell);
      inputSum = inputSum.add(currentCell.capacity);
    });

    if (inputSum.lt(neededAmount)) {
      throw new Error(
        `input capacity not enough, need ${neededAmount.toString(AmountUnit.ckb)}, got ${inputSum.toString(
          AmountUnit.ckb,
        )}`,
      );
    }

    if (inputSum.sub(outputCell.capacity).lt(Builder.MIN_CHANGE)) {
      const tx = new Transaction(new RawTransaction(inputCells, [outputCell], await this.getCellDeps()), [
        this.getWitnessPlaceholder(await this.signer.getAddress()),
      ]);
      this.fee = Builder.calcFee(tx, this.feeRate);
      outputCell.capacity = outputCell.capacity.sub(this.fee);
      return tx;
    }

    const changeCell = new Cell(
      inputSum.sub(outputCell.capacity),
      Pw.toPwScript(this.provider.parseToScript(await this.signer.getAddress())),
    );

    const tx = new Transaction(new RawTransaction(inputCells, [outputCell, changeCell], await this.getCellDeps()), [
      this.getWitnessPlaceholder(await this.signer.getAddress()),
    ]);

    this.fee = Builder.calcFee(tx, this.feeRate);

    if (changeCell.capacity.gte(Builder.MIN_CHANGE.add(this.fee))) {
      changeCell.capacity = changeCell.capacity.sub(this.fee);
      tx.raw.outputs.pop();
      tx.raw.outputs.push(changeCell);
      return tx;
    }

    // when the change cell cannot offer the transaction fee, the transaction fee will offer by the receiver
    if (changeCell.capacity.gte(Builder.MIN_CHANGE) && outputCell.capacity.gte(Builder.MIN_CHANGE.add(this.fee))) {
      outputCell.capacity = outputCell.capacity.sub(this.fee);
      tx.raw.outputs[0] = outputCell;
      return tx;
    }

    return this.build(this.fee);
  }
}
