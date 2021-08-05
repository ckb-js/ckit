import { Address, CellDep as RawCellDep, OutPoint as RawOutPoint, Script as RawScript } from '@ckb-lumos/base';
import {
  Amount,
  Builder,
  Cell,
  CellDep,
  DepType,
  HashType,
  OutPoint,
  RawTransaction,
  Script,
  Transaction,
  WitnessArgs,
} from '@lay2/pw-core';
import { MintOptions } from '..';
import { CkitProvider } from '../../providers';
import { asserts } from '../../utils';
import { getCellDeps } from '../unipass/config';

export function toPwScript(rawScript: RawScript): Script {
  return new Script(
    rawScript.code_hash,
    rawScript.args,
    rawScript.hash_type === 'type' ? HashType.type : HashType.data,
  );
}

export function toPwOutPoint(rawOutPoint: RawOutPoint): OutPoint {
  return new OutPoint(rawOutPoint.tx_hash, rawOutPoint.index);
}

export function toPwCellDep(rawCellDep: RawCellDep): CellDep {
  return new CellDep(
    rawCellDep.dep_type === 'code' ? DepType.code : DepType.depGroup,
    toPwOutPoint(rawCellDep.out_point),
  );
}

export class NonAcpPwMintBuilder extends Builder {
  constructor(private options: MintOptions, private provider: CkitProvider, private issuerAddress: Address) {
    super();
  }

  getCellDeps(): CellDep[] {
    // TODO refactor needed
    return [
      toPwCellDep(this.provider.getCellDep('SUDT')),
      toPwCellDep(this.provider.getCellDep('SECP256K1_BLAKE160')),
      toPwCellDep(this.provider.getCellDep('PW_NON_ANYONE_CAN_PAY')),
      // unipass deps
      ...getCellDeps(),
    ];
  }

  getWitnessArgsPlaceholder(): WitnessArgs {
    // TODO remove the hard code
    return Builder.WITNESS_ARGS.RawSecp256k1;
  }

  async build(): Promise<Transaction> {
    const issuerAddress = this.issuerAddress;

    const cells = await this.provider.collectCkbLiveCells(issuerAddress, '1');
    asserts(cells[0] != null);

    const script = this.provider.parseToScript(issuerAddress);

    const issuerLockScript = toPwScript(script);
    const issuerCell = new Cell(
      new Amount(cells[0].output.capacity, 0),
      issuerLockScript,
      undefined,
      toPwOutPoint(cells[0].out_point),
    );

    const issuerChangeCell = issuerCell.clone();

    const mintCells: Cell[] = this.options.recipients.map(
      (item) =>
        new Cell(
          new Amount((BigInt(item.additionalCapacity || 0) + BigInt(142 * 10 ** 8)).toString(), 0),
          toPwScript(this.provider.parseToScript(item.recipient)),
          toPwScript(this.provider.newScript('SUDT', issuerLockScript.toHash())),
          undefined,
          new Amount(item.amount, 0).toUInt128LE(),
        ),
    );

    const rawTx = new RawTransaction([issuerCell], [issuerChangeCell, ...mintCells], this.getCellDeps());
    const tx = new Transaction(rawTx, [this.getWitnessArgsPlaceholder()]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    issuerChangeCell.capacity = issuerChangeCell.capacity
      .sub(fee)
      .sub(mintCells.reduce((sum, mint) => sum.add(mint.capacity), Amount.ZERO));

    return tx;
  }
}
