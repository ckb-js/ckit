import { Hash } from '@ckb-lumos/base';
import { Transaction } from '@lay2/pw-core';
import { Modal } from 'antd';
import React from 'react';
import { useMutation, UseMutationResult } from 'react-query';
import { useConfigStorage } from './useConfigStorage';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { hasProp } from 'utils';

export function useSendTransaction(): UseMutationResult<{ txHash: Hash }, unknown, Transaction> {
  const ckitProvider = CkitProviderContainer.useContainer();
  const { currentWallet } = WalletContainer.useContainer();
  const [localConfig] = useConfigStorage();

  return useMutation(
    async (tx: Transaction) => {
      if (!currentWallet?.signer) throw new Error('exception: signed undifined');
      if (!ckitProvider) throw new Error('exception: ckitProvider undifined');
      const txHash = await ckitProvider.sendTransaction(await currentWallet.signer.seal(tx));
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
