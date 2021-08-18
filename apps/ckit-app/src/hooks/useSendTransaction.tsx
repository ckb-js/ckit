import { Hash } from '@ckb-lumos/base';
import { AbstractTransactionBuilder, CkitProvider, EntrySigner } from '@ckit/ckit';
import { Transaction } from '@lay2/pw-core';
import { Modal } from 'antd';
import React from 'react';
import { useMutation, UseMutationResult } from 'react-query';
import { useConfigStorage } from './useConfigStorage';
import { useUnipass } from './useUnipass';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { hasProp } from 'utils';

type SendTransactionOption = Transaction | ((provider: CkitProvider, signer: EntrySigner) => Promise<Transaction>);

export function useSendTransaction(): UseMutationResult<{ txHash: Hash }, unknown, SendTransactionOption> {
  const ckitProvider = CkitProviderContainer.useContainer();
  const { currentWallet } = WalletContainer.useContainer();
  const [localConfig] = useConfigStorage();
  const { cacheTx, clearTx } = useUnipass();

  return useMutation(
    async (option: SendTransactionOption) => {
      if (!currentWallet?.signer) throw new Error('exception: signer undefined');
      if (!ckitProvider) throw new Error('exception: ckitProvider undefined');

      const tx = typeof option === 'function' ? await option(ckitProvider, currentWallet.signer) : option;
      if (currentWallet.descriptor.name === 'UniPass') {
        const serializedTx = AbstractTransactionBuilder.serde.serialize(tx);
        cacheTx(JSON.stringify(serializedTx));
      }
      const txHash = await ckitProvider.sendTransaction(await currentWallet.signer.seal(tx));
      if (currentWallet.descriptor.name === 'UniPass') {
        clearTx();
      }
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
