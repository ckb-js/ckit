import { CheckCircleTwoTone } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { displayWalletName, WalletContainer } from 'containers/WalletContainer';

export const WalletConnectFC: React.FC = () => {
  const { currentWallet, setModalVisible } = WalletContainer.useContainer();

  if (currentWallet) {
    return (
      <Button size="small" onClick={() => setModalVisible(true)}>
        <Space>
          {displayWalletName(currentWallet.descriptor.name)}
          <CheckCircleTwoTone />
        </Space>
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
