import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript, Signer } from '@ckit/base';
import { Amount, Builder, Cell, CellDep, RawTransaction, Transaction, WitnessArgs } from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { boom } from '../../utils';
import { getCellDeps } from '../unipass/config';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class TransferSudtPwBuilder extends Builder {
  constructor(private options: TransferOptions, private provider: CkitProvider, private signer: Signer) {
    super();
  }

  // TODO get witnessArgs by script
  private getWitnessArgs(_address: Address): WitnessArgs {
    // TODO fill the witNessArgs
    return Builder.WITNESS_ARGS.RawSecp256k1;
  }

  private async getCellDeps(): Promise<CellDep[]> {
    const sender = await this.signer.getAddress();
    const recipient = this.options.recipient;

    const senderLockDep = this.provider.findCellDepByAddress(sender);
    if (!senderLockDep) {
      boom(`cannot find sender ${sender} lock dep, maybe the provider is not inited`);
    }

    const recipientLockDep = this.provider.findCellDepByAddress(recipient);
    if (!recipientLockDep) {
      boom(`cannot find recipient ${recipient} lock dep, maybe the provider is not inited`);
    }

    const udtTypeDep = this.provider.findCellDepByScript(this.options.sudt);
    if (!udtTypeDep) {
      boom(`cannot find udt ${this.options.sudt} dep, maybe the provider is not inited`);
    }

    const isSameLockDep = Pw.toPwCellDep(senderLockDep).sameWith(Pw.toPwCellDep(recipientLockDep));
    const lockDeps = isSameLockDep
      ? [Pw.toPwCellDep(senderLockDep)]
      : [Pw.toPwCellDep(senderLockDep), Pw.toPwCellDep(recipientLockDep)];

    return [
      ...lockDeps,
      Pw.toPwCellDep(udtTypeDep),
      Pw.toPwCellDep(this.provider.getCellDep('SECP256K1_BLAKE160')),
      // unipass deps
      ...getCellDeps(),
    ];
  }

  async build(): Promise<Transaction> {
    const { sudt, recipient, amount } = this.options;
    const sender = await this.signer.getAddress();

    const senderSudts = await this.provider.collectUdtCells(sender, sudt, amount);
    const recipientSudt = (await this.provider.collectUdtCells(recipient, sudt, '0'))[0];

    const cellDeps = await this.getCellDeps();
    if (!recipientSudt) boom(`recipient ${recipient} has no cell to carry the udt`);

    const senderInputs: Cell[] = senderSudts.map(
      (point) =>
        new Cell(
          new Amount(point.output.capacity, 0),
          Pw.toPwScript(point.output.lock),
          point.output.type && Pw.toPwScript(point.output.type),
          Pw.toPwOutPoint(point.out_point),
          point.output_data,
        ),
    );

    const recipientInput: Cell = new Cell(
      new Amount(recipientSudt.output.capacity, 0),
      Pw.toPwScript(recipientSudt.output.lock),
      recipientSudt.output.type && Pw.toPwScript(recipientSudt.output.type),
      Pw.toPwOutPoint(recipientSudt.out_point),
      recipientSudt.output_data,
    );

    // increase recipient sudt
    const recipientOutput = recipientInput.clone();
    recipientOutput.setSUDTAmount(recipientOutput.getSUDTAmount().add(new Amount(this.options.amount, 0)));

    const senderOutput = senderInputs.reduce((sum, input) => {
      sum.capacity = sum.capacity.add(input.capacity);
      sum.setSUDTAmount(sum.getSUDTAmount().add(input.getSUDTAmount()));
      return sum;
    });

    // decrease sender sudt
    senderOutput.setSUDTAmount(senderOutput.getSUDTAmount().sub(new Amount(this.options.amount, 0)));

    const tx = new Transaction(
      new RawTransaction([...senderInputs, recipientInput], [senderOutput, recipientOutput], cellDeps),
      senderInputs.map(() => this.getWitnessArgs(sender)),
    );

    // TODO fix fee
    // fee from sender sudt capacity
    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    senderOutput.capacity = senderOutput.capacity.sub(fee);

    // TODO collect another cell for fee
    if (senderOutput.availableFee().lte(Amount.ZERO)) {
      boom('only the additional capacity of the sudt cell is supported as a fee');
    }

    return tx;
  }
}
