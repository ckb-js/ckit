import { Address } from '@ckb-lumos/base';
import { Amount, Builder, Cell, RawTransaction, Transaction, WitnessArgs } from '@lay2/pw-core';
import { MintOptions } from '..';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { asserts } from '../../utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class NonAcpPwMintBuilder extends AbstractPwSenderBuilder {
  constructor(private options: MintOptions, provider: CkitProvider, private issuerAddress: Address) {
    super(provider);
  }

  getWitnessArgsPlaceholder(): WitnessArgs {
    // TODO remove the hard code
    return Builder.WITNESS_ARGS.Secp256k1;
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

    const issuerChangeCell = issuerCell.clone();

    const mintCells: Cell[] = this.options.recipients.map(
      (item) =>
        new Cell(
          new Amount((BigInt(item.additionalCapacity || 0) + BigInt(142 * 10 ** 8)).toString(), 0),
          Pw.toPwScript(this.provider.parseToScript(item.recipient)),
          Pw.toPwScript(this.provider.newScript('SUDT', issuerLockScript.toHash())),
          undefined,
          new Amount(item.amount, 0).toUInt128LE(),
        ),
    );

    const rawTx = new RawTransaction([issuerCell], [issuerChangeCell, ...mintCells], this.getCellDeps());
    const tx = new Transaction(rawTx, [this.getWitnessArgsPlaceholder()]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE)).add(new Amount('1000', 0));
    issuerChangeCell.capacity = issuerChangeCell.capacity
      .sub(fee)
      .sub(mintCells.reduce((sum, mint) => sum.add(mint.capacity), Amount.ZERO));

    return tx;
  }
}
