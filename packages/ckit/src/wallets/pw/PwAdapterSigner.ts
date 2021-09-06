/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { AbstractProvider } from '@ckitjs/base';
import {
  Blake2bHasher,
  Hasher,
  Message,
  transformers,
  Transaction,
  SerializeRawTransaction,
  normalizers,
  WitnessArgs,
  SerializeWitnessArgs,
  Reader,
} from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { AbstractSingleEntrySigner } from '../AbstractSingleEntrySigner';

export class PwAdapterSigner {
  constructor(
    private rawSigner: AbstractSingleEntrySigner,
    private provider: AbstractProvider,
    private hasher: Hasher = new Blake2bHasher(),
  ) {}

  protected async signMessages(messages: Message[]): Promise<string[]> {
    const sigs = [];
    const signerLock = Pw.toPwScript(this.provider.parseToScript(await this.rawSigner.getAddress()));

    for (const item of messages) {
      if (item.lock.codeHash !== signerLock.codeHash || item.lock.hashType !== signerLock.hashType) continue;

      const sig = await this.rawSigner.signMessage(item.message);
      sigs.push(sig);
    }

    return sigs;
  }

  async sign(tx: Transaction): Promise<Transaction> {
    const messages = this.toMessages(tx);
    const witnesses = await this.signMessages(messages);

    for (let i = 0; i < messages.length; i++) {
      const { index } = messages[i]!;
      if (index < tx.witnessArgs.length && typeof tx.witnessArgs[index] !== 'string') {
        witnesses[i] = new Reader(
          SerializeWitnessArgs(
            normalizers.NormalizeWitnessArgs({
              ...(tx.witnessArgs[index] as WitnessArgs),
              lock: witnesses[i],
            }),
          ),
        ).serializeJson();
      }
    }
    tx = FillSignedWitnesses(tx, messages, witnesses);

    return tx;
  }

  public toMessages(tx: Transaction): Message[] {
    tx.validate();

    if (tx.raw.inputs.length !== tx.raw.inputCells.length) {
      throw new Error('Input number does not match!');
    }

    const txHash = new Blake2bHasher().hash(
      new Reader(
        SerializeRawTransaction(normalizers.NormalizeRawTransaction(transformers.TransformRawTransaction(tx.raw))),
      ),
    );

    const messages = [];
    const used = tx.raw.inputs.map((_input) => false);
    for (let i = 0; i < tx.raw.inputs.length; i++) {
      if (used[i] || tx.witnesses[i] === '0x') {
        continue;
      }
      if (i >= tx.witnesses.length) {
        throw new Error(`Input ${i} starts a new script group, but witness is missing!`);
      }
      used[i] = true;
      this.hasher.update(txHash);
      const firstWitness = new Reader(tx.witnesses[i]!);
      this.hasher.update(serializeBigInt(firstWitness.length()));
      this.hasher.update(firstWitness);
      for (let j = i + 1; j < tx.raw.inputs.length && j < tx.witnesses.length; j++) {
        if (tx.raw.inputCells[i]!.lock.sameWith(tx.raw.inputCells[j]!.lock)) {
          used[j] = true;
          const currentWitness = new Reader(tx.witnesses[j]!);
          this.hasher.update(serializeBigInt(currentWitness.length()));
          this.hasher.update(currentWitness);
        }
      }
      messages.push({
        index: i,
        message: this.hasher.digest().serializeJson(), // hex string
        lock: tx.raw.inputCells[i]!.lock,
      });

      this.hasher.reset();
    }
    return messages;
  }
}

function FillSignedWitnesses(tx: Transaction, messages: Message[], witnesses: string[]) {
  if (messages.length !== witnesses.length) {
    throw new Error('Invalid number of witnesses!');
  }
  for (let i = 0; i < messages.length; i++) {
    tx.witnesses[messages[i]!.index] = witnesses[i]!;
  }
  return tx;
}

function serializeBigInt(i: number): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(8));
  view.setUint32(0, i, true);
  return view.buffer;
}
