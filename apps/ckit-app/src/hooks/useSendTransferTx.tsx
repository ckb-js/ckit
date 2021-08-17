import { Address, HexNumber } from '@ckb-lumos/base';
import { AcpTransferSudtBuilder, TransferCkbBuilder, AbstractTransactionBuilder } from '@ckit/ckit';
import { Transaction } from '@lay2/pw-core';
import { useMutation, UseMutationResult } from 'react-query';
import { AssetMeta } from './useAssetMetaStorage';
import { useSendTransaction } from './useSendTransaction';
import { useUnipassTxStorage } from './useUnipassTxStorage';
import { CkitProviderContainer, WalletContainer } from 'containers';

export interface SendTransferTxInput {
  recipient: Address;
  amount: HexNumber;
  script: AssetMeta['script'];
}

export function useSendTransferTx(): UseMutationResult<unknown, unknown, SendTransferTxInput> {
  const { currentWallet } = WalletContainer.useContainer();
  const ckitProvider = CkitProviderContainer.useContainer();
  const [, setUnipassTx] = useUnipassTxStorage();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  return useMutation(['sendTransferTx'], async (input: SendTransferTxInput) => {
    if (!currentWallet?.signer) throw new Error('exception: signed undifined');
    if (!ckitProvider) throw new Error('exception: ckitProvider undifined');
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
    if (currentWallet.descriptor.name === 'UniPass') {
      const serializedTx = AbstractTransactionBuilder.serde.serialize(txToSend);
      setUnipassTx(JSON.stringify(serializedTx));
    }
    await sendTransaction(txToSend);
  });
}
