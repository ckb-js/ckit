import { Address, HexNumber } from '@ckb-lumos/base';
import { AcpTransferSudtBuilder, TransferCkbBuilder } from '@ckit/ckit';
import { Transaction } from '@lay2/pw-core';
import { useMutation, UseMutationResult } from 'react-query';
import { AssetMeta } from './useAssetMetaStorage';
import { useSendTransaction } from './useSendTransaction';
import { CkitProviderContainer, WalletContainer } from 'containers';

export interface SendTransferTxInput {
  recipient: Address;
  amount: HexNumber;
  script: AssetMeta['script'];
}

export function useSendTransferTx(): UseMutationResult<unknown, unknown, SendTransferTxInput> {
  const { currentWallet } = WalletContainer.useContainer();
  const ckitProvider = CkitProviderContainer.useContainer();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  return useMutation(['sendTransferTx'], async (input: SendTransferTxInput) => {
    if (!currentWallet?.signer) throw new Error('exception: signer undefined');
    if (!ckitProvider) throw new Error('exception: ckitProvider undefined');
    let txToSend: Transaction;

    if (input.script) {
      const txBuilder = new AcpTransferSudtBuilder(
        {
          recipient: input.recipient,
          sudt: input.script,
          amount: input.amount,
        },
        ckitProvider,
        currentWallet.signer,
      );
      txToSend = await txBuilder.build();
    } else {
      const txBuilder = new TransferCkbBuilder(
        { recipients: [{ recipient: input.recipient, amount: input.amount, capacityPolicy: 'createAcp' }] },
        ckitProvider,
        currentWallet.signer,
      );
      txToSend = await txBuilder.build();
    }
    await sendTransaction(txToSend);
  });
}
