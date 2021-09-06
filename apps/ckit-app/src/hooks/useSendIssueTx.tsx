import { Address, HexNumber } from '@ckb-lumos/base';
import { RecipientOptions, helpers, MintSudtBuilder, CkitProvider, EntrySigner } from '@ckitjs/ckit';
import { useMutation, UseMutationResult } from 'react-query';
import { useSendTransaction } from './useSendTransaction';

export interface SendIssueTxInput {
  recipient: Address;
  amount: HexNumber;
  operationKind: 'invite' | 'issue';
}

export function useSendIssueTx(): UseMutationResult<unknown, unknown, SendIssueTxInput> {
  const { mutateAsync: sendTransaction } = useSendTransaction();

  return useMutation(['sendIssueTx'], async (input: SendIssueTxInput) => {
    const buildTx = async (provider: CkitProvider, signer: EntrySigner) => {
      const recipientsParams: RecipientOptions = {
        recipient: input.recipient,
        amount: input.amount,
      };
      if (input.operationKind === 'invite') {
        recipientsParams.capacityPolicy = 'createCell';
        recipientsParams.additionalCapacity = helpers.CkbAmount.fromCkb(1).toHex();
        recipientsParams.amount = '0';
      } else {
        recipientsParams.capacityPolicy = 'findAcp';
      }
      const txBuilder = new MintSudtBuilder({ recipients: [recipientsParams] }, provider, signer);
      return txBuilder.build();
    };

    await sendTransaction(buildTx);
  });
}
