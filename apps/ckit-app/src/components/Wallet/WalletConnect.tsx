import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { WalletContainer } from 'containers/WalletContainer';

export const WalletConnectFC: React.FC = () => {
  const { currentWallet, setModalVisible } = WalletContainer.useContainer();

  if (currentWallet) {
    return (
      <Button size="small" onClick={() => setModalVisible(true)}>
        connected to {currentWallet.descriptor.name}
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
