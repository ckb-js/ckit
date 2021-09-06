import { AbstractTransactionBuilder } from '@ckitjs/ckit';
import { Transaction } from '@lay2/pw-core';
import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { WalletContainer } from 'containers';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { useUnipass } from 'hooks/useUnipass';

export const OnIncomplete: React.FC = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { isInitialized, setCurrentWalletName } = WalletContainer.useContainer();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const { shouldLogin, cacheLogin, shouldSendTx, cachedTx } = useUnipass();

  useEffect(() => {
    void (async () => {
      if (shouldLogin) {
        setCurrentWalletName('UniPass');
        cacheLogin();
      }

      if (shouldSendTx) {
        if (!isInitialized) return;
        if (!cachedTx) throw new Error('Could not find transaction to send');
        const txToSend = AbstractTransactionBuilder.serde.deserialize(cachedTx);
        await sendTransaction(txToSend as Transaction).catch(() => setIsLoaded(true));
      }

      setIsLoaded(true);
    })();
  }, [isInitialized]);

  if (!isLoaded) return <Spin />;
  return <>{children}</>;
};
