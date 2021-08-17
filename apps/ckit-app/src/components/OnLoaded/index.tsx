import { UnipassWallet, AbstractTransactionBuilder } from '@ckit/ckit';
import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { WalletContainer } from 'containers';
import { useSendTransaction } from 'hooks/useSendTransaction';

export const OnIncomplete: React.FC = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentWallet, wallets, setCurrentWalletName } = WalletContainer.useContainer();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  useEffect(() => {
    void (async () => {
      const adapter = new UnipassWallet.UnipassRedirectAdapter({ host: 'https://unipass.xyz' }); // TODO  use the config

      if (adapter.hasLoginInfo()) {
        setCurrentWalletName('UniPass');
        adapter.saveLoginInfo();
      }

      // if (adapter.hasSigData()) {
      //   const savedTx = AbstractTransactionBuilder.serde.deserialize(JSON.parse(localStorage.getItem('...')));
      //   const sealed = await currentWallet?.signer?.seal(savedTx);
      //   await sendTransaction(sealed);
      // }

      setIsLoaded(true);
    })();
  }, []);

  if (!isLoaded) return <Spin />;
  return <>{children}</>;
};
