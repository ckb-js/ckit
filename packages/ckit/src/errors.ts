import { HexNumber, HexString, Script } from '@ckb-lumos/base';

export class CkitError<Metadata> extends Error {
  constructor(public metadata: Metadata, message?: string) {
    super(message);
  }
}

type NoAvailableMetadata = {
  lock: Script;
  type?: Script;
};

export class NoAvailableCellError extends CkitError<NoAvailableMetadata> {
  constructor(metadata: NoAvailableMetadata, message = 'Cannot find available cell') {
    super(metadata, message);
  }
}

type NoEnoughAmountMetadata = { expected: HexNumber; actual: HexNumber; lock: Script };
export class NoEnoughCkbError extends CkitError<NoEnoughAmountMetadata> {
  constructor(
    metadata: NoEnoughAmountMetadata,
    message = `Udt is not enough, expected minimal amount: ${metadata.expected}, actual: ${metadata.actual}`,
  ) {
    super(metadata, message);
  }
}
export class NoEnoughUdtError extends CkitError<NoEnoughAmountMetadata> {
  constructor(
    metadata: NoEnoughAmountMetadata,
    message = `Ckb is not enough, expected minimal amount: ${metadata.expected}, actual: ${metadata.actual}`,
  ) {
    super(metadata, message);
  }
}

type RecipientSameWithSenderMetadata = {
  address: HexString;
};
export class RecipientSameWithSenderError extends CkitError<RecipientSameWithSenderMetadata> {
  constructor(metadata: RecipientSameWithSenderMetadata, message = `The recipient and sender cannot be the same one`) {
    super(metadata, message);
  }
}
