import { Address, HexNumber } from '@ckb-lumos/base';
import { AcpTransferSudtBuilder, TransferCkbBuilder, CkitProvider, EntrySigner } from '@ckitjs/ckit';
import { useMutation, UseMutationResult } from 'react-query';
import { AssetMeta } from './useAssetMetaStorage';
import { useSendTransaction } from './useSendTransaction';

export interface SendTransferTxInput {
  recipient: Address;
  amount: HexNumber;
  script: AssetMeta['script'];
}

export function useSendTransferTx(): UseMutationResult<unknown, unknown, SendTransferTxInput> {
  const { mutateAsync: sendTransaction } = useSendTransaction();

  return useMutation(['sendTransferTx'], async (input: SendTransferTxInput) => {
    const buildTx = async (provider: CkitProvider, signer: EntrySigner) => {
      if (input.script) {
        const txBuilder = new AcpTransferSudtBuilder(
          [
            {
              recipient: input.recipient,
              sudt: input.script,
              amount: input.amount,
              policy: 'findAcp',
            },
          ],
          provider,
          signer,
        );
        return txBuilder.build();
      } else {
        const txBuilder = new TransferCkbBuilder(
          { recipients: [{ recipient: input.recipient, amount: input.amount, capacityPolicy: 'createCell' }] },
          provider,
          signer,
        );
        return txBuilder.build();
      }
    };

    await sendTransaction(buildTx);
  });
}
