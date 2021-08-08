import { Address } from '@ckb-lumos/base';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { MintOptions } from '..';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { asserts, boom } from '../../utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

// TODO dynamic lock args
//  the capacity of lock args is assumed to be a fixed 20 bytes,
//  it should be a calced value
const SUDT_TYPE_SCRIPT_CAPACITY =
  10n ** 8n *
  BigInt(
    8 /* capacity: u64 */ +
      /* lock script */
      32 /* code_hash: U256 */ +
      20 /* lock_args: blake160 */ +
      1 /* hash_type: u8 */ +
      /* type script */
      32 /* code_hash: U256 */ +
      32 /* args: U256, issuer lock hash */ +
      1 /* hash_type: u8 */ +
      /* output_data */
      16 /* data: u128, amount, little-endian */,
  );

export class NonAcpPwMintBuilder extends AbstractPwSenderBuilder {
  constructor(private options: MintOptions, provider: CkitProvider, private issuerAddress: Address) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const issuerAddress = this.issuerAddress;

    const cells = await this.provider.collectCkbLiveCells(issuerAddress, '1');
    asserts(cells[0] != null);

    const script = this.provider.parseToScript(issuerAddress);

    const issuerLockScript = Pw.toPwScript(script);
    const issuerCell = new Cell(
      new Amount(cells[0].output.capacity, 0),
      issuerLockScript,
      undefined,
      Pw.toPwOutPoint(cells[0].out_point),
    );

    const udtType = this.provider.newScript('SUDT', issuerLockScript.toHash());

    const createdRecipientCells = this.options.recipients
      .filter((item) => item.capacityPolicy === 'createAcp')
      .map(
        (item) =>
          new Cell(
            new Amount((BigInt(item.additionalCapacity || 0) + BigInt(SUDT_TYPE_SCRIPT_CAPACITY)).toString(), 0),
            Pw.toPwScript(this.provider.parseToScript(item.recipient)), // recipient lock
            Pw.toPwScript(udtType), // issued sudt type
            undefined,
            new Amount(item.amount, 0).toUInt128LE(),
          ),
      );

    const resolvedFindAcpCells = this.options.recipients.filter((item) => item.capacityPolicy === 'findAcp');
    const foundRecipientCells$ = from(resolvedFindAcpCells).pipe(
      // collect the udt cell from recipients, throw an error if no udt cell is found
      mergeMap(async (item) => {
        const resolved = (await this.provider.collectUdtCells(item.recipient, udtType, '0'))[0];
        if (!resolved) boom(`Cannot find available udt cells from ${item.recipient}`);

        const cell = Pw.toPwCell(resolved);
        cell.capacity = cell.capacity.add(new Amount(item.additionalCapacity || '0', 0));
        cell.setSUDTAmount(cell.getSUDTAmount().add(new Amount(item.amount, 0)));

        return cell;
      }, 5),
      toArray(),
    );
    const foundRecipientCells = await lastValueFrom(foundRecipientCells$);

    const issuerChangeCell = issuerCell.clone();

    const rawTx = new RawTransaction(
      [issuerCell, ...foundRecipientCells],
      [issuerChangeCell, ...createdRecipientCells, ...foundRecipientCells],
      this.getCellDeps(),
    );
    const tx = new Transaction(rawTx, [this.getWitnessPlaceholder(issuerAddress)]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    const createdRecipientCellsCapacity = createdRecipientCells.reduce(
      (sum, createdCell) => sum.add(createdCell.capacity),
      Amount.ZERO,
    );
    const foundRecipientCellsAdditionalCapacity = resolvedFindAcpCells.reduce(
      (sum, foundCell) => sum.add(new Amount(foundCell.additionalCapacity || '0', 0)),
      Amount.ZERO,
    );

    issuerChangeCell.capacity = issuerChangeCell.capacity
      .sub(fee)
      .sub(createdRecipientCellsCapacity)
      .sub(foundRecipientCellsAdditionalCapacity);

    return tx;
  }
}
