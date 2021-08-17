import { Transaction } from '@lay2/pw-core';
import { serialize, deserialize } from '../helpers/pw';
import { SerializedTx as PwSerialized } from '../helpers/pw.serde';

export type SerializedTx = unknown;
export type DeserializedTx = unknown;

// TODO migrate to mercury mode
export abstract class AbstractTransactionBuilder {
  static serde = {
    serialize(deserialized: DeserializedTx): SerializedTx {
      return serialize(deserialized as Transaction);
    },

    deserialize(serialized: SerializedTx): DeserializedTx {
      return deserialize(serialized as PwSerialized);
    },
  };

  abstract build(): Promise<DeserializedTx>;

  serialize(tx: DeserializedTx): SerializedTx {
    return AbstractTransactionBuilder.serde.serialize(tx);
  }
}
