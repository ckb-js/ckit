import { Address, HexNumber } from '@ckb-lumos/base';
import { RecipientOptions, helpers, MintSudtBuilder } from '@ckit/ckit';
import { useMutation, UseMutationResult } from 'react-query';
import { useSendTransaction } from './useSendTransaction';
import { CkitProviderContainer, WalletContainer } from 'containers';

export interface SendIssueTxInput {
  recipient: Address;
  amount: HexNumber;
  operationKind: 'invite' | 'issue';
}

export function useSendIssueTx(): UseMutationResult<unknown, unknown, SendIssueTxInput> {
  const { currentWallet } = WalletContainer.useContainer();
  const ckitProvider = CkitProviderContainer.useContainer();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  return useMutation(['sendIssueTx'], async (input: SendIssueTxInput) => {
    if (!currentWallet?.signer) throw new Error('exception: signer undifined');
    if (!ckitProvider) throw new Error('exception: ckitProvider undifined');

    const recipientsParams: RecipientOptions = {
      recipient: input.recipient,
      amount: input.amount,
    };
    if (input.operationKind === 'invite') {
      recipientsParams.capacityPolicy = 'createAcp';
      recipientsParams.additionalCapacity = helpers.CkbAmount.fromCkb(1).toHex();
      recipientsParams.amount = '0';
    } else {
      recipientsParams.capacityPolicy = 'findAcp';
    }
    const txBuilder = new MintSudtBuilder({ recipients: [recipientsParams] }, ckitProvider, currentWallet.signer);
    const issueTx = await txBuilder.build();
    await sendTransaction(issueTx);
  });
}
