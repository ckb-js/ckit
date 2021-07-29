import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { WalletContainer } from 'containers/WalletContainer';

export const WalletConnectFC: React.FC = () => {
  const { currentWalletIndex, wallets, setModalVisible } = WalletContainer.useContainer();

  if (currentWalletIndex !== null) {
    const walletName = wallets[currentWalletIndex]?.name;
    return (
      <Button size="small" type="primary" disabled>
        Connected to {walletName}
      </Button>
    );
  }

  return (
    <Button size="small" type="primary" onClick={() => setModalVisible(true)}>
      Connect
    </Button>
  );
};

export const WalletConnect = observer(WalletConnectFC);
