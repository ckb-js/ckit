import { UnipassWallet, AbstractTransactionBuilder } from '@ckit/ckit';
import { Transaction } from '@lay2/pw-core';
import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { WalletContainer } from 'containers';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { useUnipassTxStorage } from 'hooks/useUnipassTxStorage';

export const OnIncomplete: React.FC = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { isInitialized, setCurrentWalletName } = WalletContainer.useContainer();
  const [unipassTx] = useUnipassTxStorage();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  useEffect(() => {
    void (async () => {
      const adapter = new UnipassWallet.UnipassRedirectAdapter({ host: 'https://unipass.xyz' }); // TODO  use the config

      if (adapter.hasLoginInfo()) {
        setCurrentWalletName('UniPass');
        adapter.saveLoginInfo();
      }

      if (adapter.hasSigData()) {
        if (!isInitialized) return;
        if (!unipassTx) throw new Error('Could not find transaction to send');
        const savedTx = AbstractTransactionBuilder.serde.deserialize(unipassTx);
        await sendTransaction(savedTx as Transaction);
      }

      setIsLoaded(true);
    })();
  }, [isInitialized]);

  if (!isLoaded) return <Spin />;
  return <>{children}</>;
};
