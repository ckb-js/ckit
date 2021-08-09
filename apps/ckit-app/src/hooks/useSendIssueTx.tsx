import { Address, HexNumber, Hash } from '@ckb-lumos/base';
import { Modal } from 'antd';
import { RecipientOptions, helpers, MintSudtBuilder } from 'ckit';
import React from 'react';
import { useMutation, UseMutationResult } from 'react-query';
import { useConfigStorage } from './useConfigStorage';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { hasProp } from 'utils';

export interface SendIssueTxInput {
  recipient: Address;
  amount: HexNumber;
  operationKind: 'invite' | 'issue';
}

export function useSendIssueTx(): UseMutationResult<{ txHash: Hash }, unknown, SendIssueTxInput> {
  const { selectedWallet } = WalletContainer.useContainer();
  const ckitProvider = CkitProviderContainer.useContainer();
  const [localConfig] = useConfigStorage();

  return useMutation(
    ['sendIssueTx'],
    async (input: SendIssueTxInput) => {
      if (!selectedWallet?.signer) throw new Error('exception: signer undifined');
      if (!ckitProvider) throw new Error('exception: ckitProvider undifined');

      const recipientsParams: RecipientOptions = {
        recipient: input.recipient,
        amount: input.amount,
      };
      if (input.operationKind === 'invite') {
        recipientsParams.capacityPolicy = 'createAcp';
        // TODO make the additionalCapacity configurable
        // create acp with additionalAcp
        recipientsParams.additionalCapacity = helpers.CkbAmount.fromCkb(1).toString();
        recipientsParams.amount = '0';
      } else {
        recipientsParams.capacityPolicy = 'findAcp';
      }
      const txBuilder = new MintSudtBuilder({ recipients: [recipientsParams] }, ckitProvider, selectedWallet.signer);
      const issueTx = await txBuilder.build();
      const txHash = await ckitProvider.sendTransaction(issueTx);
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
