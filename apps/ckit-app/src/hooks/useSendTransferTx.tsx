import { Address, HexNumber, Hash, Transaction } from '@ckb-lumos/base';
import { Modal } from 'antd';
import { RecipientOptions, MercuryProvider, AcpTransferSudtBuilder, TransferCkbBuilder } from 'ckit';
import React from 'react';
import { useMutation, UseMutationResult } from 'react-query';
import { AssetMeta } from './useAssetMetaStorage';
import { useConfigStorage } from './useConfigStorage';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { hasProp } from 'utils';

export interface SendTransferTxInput {
  recipient: Address;
  amount: HexNumber;
  assetMeta: AssetMeta;
}

export function useSendTransferTx(): UseMutationResult<{ txHash: Hash }, unknown, SendTransferTxInput> {
  const { selectedWallet } = WalletContainer.useContainer();
  const ckitProvider = CkitProviderContainer.useContainer();
  const [localConfig] = useConfigStorage();

  return useMutation(
    ['sendTransferTx'],
    async (input: SendTransferTxInput) => {
      if (!selectedWallet?.signer) throw new Error('exception: signed undifined');
      if (!ckitProvider) throw new Error('exception: ckitProvider undifined');
      let txToSend: Transaction;

      if (input.assetMeta.script) {
        const txBuilder = new AcpTransferSudtBuilder(
          {
            recipient: input.recipient,
            sudt: input.assetMeta.script,
            amount: input.amount,
          },
          ckitProvider as MercuryProvider,
          selectedWallet.signer,
        );
        txToSend = await txBuilder.build();
      } else {
        const recipientsParams: RecipientOptions = {
          recipient: input.recipient,
          amount: input.amount,
          capacityPolicy: 'findOrCreateAcp',
        };
        const txBuilder = new TransferCkbBuilder(
          { recipients: [recipientsParams] },
          ckitProvider,
          selectedWallet.signer,
        );
        txToSend = await txBuilder.build();
      }
      const txHash = await ckitProvider.sendTransaction(txToSend);
      return { txHash: txHash };
    },
    {
      onSuccess({ txHash }) {
        const href = localConfig.nervosExploreTxUrlPrefix + txHash;
        Modal.success({
          title: 'Tx sent',
          content: (
            <p>
              The transaction was sent, check it in&nbsp;
              <a href={href} target="_blank" rel="noreferrer">
                explorer
              </a>
              <details>
                <summary>transaction id</summary>
                {txHash}
              </details>
            </p>
          ),
        });
      },
      onError(error) {
        const errorMsg: string = hasProp(error, 'message') ? String(error.message) : 'Unknown error';
        Modal.error({ title: 'Tx failed', content: errorMsg, width: 360 });
      },
    },
  );
}
