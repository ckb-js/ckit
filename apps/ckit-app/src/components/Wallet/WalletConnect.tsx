import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { WalletContainer } from 'containers/WalletContainer';

export const WalletConnectFC: React.FC = () => {
  const { selectedWallet, setModalVisible } = WalletContainer.useContainer();

  if (selectedWallet) {
    return (
      <Button size="small" type="primary" disabled>
        connected to {selectedWallet.descriptor.name}
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
