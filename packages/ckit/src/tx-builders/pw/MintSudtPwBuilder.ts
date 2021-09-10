import { Address } from '@ckb-lumos/base';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { MintOptions } from '..';
import { NoAvailableCellError } from '../../errors';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { byteLenOfCkbLiveCell, byteLenOfSudt } from '../builder-utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class NonAcpPwMintBuilder extends AbstractPwSenderBuilder {
  constructor(private options: MintOptions, provider: CkitProvider, private issuerAddress: Address) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const udtType = this.provider.newSudtScript(this.issuerAddress);

    // capacity provided by issuer
    const createdRecipientCells = this.options.recipients
      .filter((item) => item.capacityPolicy === 'createCell')
      .map(
        (item) =>
          new Cell(
            new Amount(String(BigInt(item.additionalCapacity || 0)), 0).add(new Amount(String(byteLenOfSudt()))),
            Pw.toPwScript(this.provider.parseToScript(item.recipient)), // recipient lock
            Pw.toPwScript(udtType), // issued sudt type
            undefined,
            new Amount(item.amount, 0).toUInt128LE(),
          ),
      );

    // capacity provided by recipient
    const resolvedFindAcpCells = this.options.recipients.filter((item) => item.capacityPolicy === 'findAcp');
    const foundRecipientCells$ = from(resolvedFindAcpCells).pipe(
      // collect the udt cell from recipients, throw an error if no udt cell is found
      mergeMap(async (item) => {
        const resolved = (await this.provider.collectUdtCells(item.recipient, udtType, '0'))[0];
        if (!resolved) {
          throw new NoAvailableCellError({ lock: this.provider.parseToScript(item.recipient), type: udtType });
        }

        const cell = Pw.toPwCell(resolved);
        cell.capacity = cell.capacity.add(new Amount(item.additionalCapacity || '0', 0));
        cell.setSUDTAmount(cell.getSUDTAmount().add(new Amount(item.amount, 0)));

        return cell;
      }, 5),
      toArray(),
    );
    const foundRecipientCells = await lastValueFrom(foundRecipientCells$);

    const createdRecipientCellsCapacity = createdRecipientCells.reduce(
      (sum, createdCell) => sum.add(createdCell.capacity),
      Amount.ZERO,
    );
    const foundRecipientCellsAdditionalCapacity = resolvedFindAcpCells.reduce(
      (sum, foundCell) => sum.add(new Amount(foundCell.additionalCapacity || '0', 0)),
      Amount.ZERO,
    );

    const neededCapacityFromIssuer = createdRecipientCellsCapacity
      .add(foundRecipientCellsAdditionalCapacity)
      // additional 61 ckb to ensure capacity is enough for change cell
      .add(new Amount(String(byteLenOfCkbLiveCell())))
      // additional 1 ckb for tx fee, not all 1ckb will be paid,
      // but the real fee will be calculated based on feeRate
      .add(new Amount('1'));

    const issuerOutpoints = await this.provider.collectCkbLiveCells(
      this.issuerAddress,
      neededCapacityFromIssuer.toHexString(),
    );

    const issuerCells = issuerOutpoints.map(Pw.toPwCell);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const issuerOutput = issuerCells[0]!.clone();
    issuerOutput.capacity = issuerCells.reduce((sum, inputCell) => sum.add(inputCell.capacity), Amount.ZERO);

    const inputCells = [...issuerCells, ...foundRecipientCells];
    const outputs = [issuerOutput, ...createdRecipientCells, ...foundRecipientCells];
    const rawTx = new RawTransaction(inputCells, outputs, this.getCellDepsByCells(inputCells, outputs));

    const tx = new Transaction(rawTx, [this.getWitnessPlaceholder(this.issuerAddress)]);
    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));

    issuerOutput.capacity = issuerOutput.capacity
      .sub(fee)
      .sub(createdRecipientCellsCapacity)
      .sub(foundRecipientCellsAdditionalCapacity);

    return tx;
  }
}
