import { SyncOutlined, CheckCircleTwoTone, UsbOutlined } from '@ant-design/icons';
import { AbstractWallet } from '@ckit/base';
import { List, Modal, Space, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { DisplayWalletName, WalletContainer } from 'containers/WalletContainer';

const ModalBorderWrapper = styled.div`
  .ant-list-item {
    padding: 4px 0;
    margin: 4px 0;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0);
    &:hover {
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      cursor: pointer;
    }
  }
`;

export const WalletList = observer(() => {
  const { wallets, visible, setCurrentWalletIndex, setError, setModalVisible } = WalletContainer.useContainer();

  return (
    <Modal closable width={312} visible={visible} onCancel={() => setModalVisible(false)} footer={null}>
      <ModalBorderWrapper>
        <List
          style={{ marginTop: '24px' }}
          pagination={false}
          dataSource={wallets}
          renderItem={(item, index) => (
            <List.Item
              onClick={() => {
                setError(null);
                if (item.getConnectStatus() === 'disconnected') {
                  item.connect();
                }
                if (item.getConnectStatus() === 'connected') {
                  setCurrentWalletIndex(index);
                  setModalVisible(false);
                }
              }}
            >
              <WalletListItem wallet={item} index={index} />
            </List.Item>
          )}
        />
      </ModalBorderWrapper>
    </Modal>
  );
});

export interface WalletListItemProps {
  wallet: AbstractWallet;
  index: number;
}

export const WalletListItem = observer((props: WalletListItemProps) => {
  const { wallet, index } = props;
  const { error } = WalletContainer.useContainer();
  if (wallet.getConnectStatus() === 'disconnected') {
    return (
      <div>
        <Space>
          {DisplayWalletName(wallet.name)}
          <UsbOutlined />
        </Space>
        {error && error.index === index && <Typography.Text type="danger"> {error.error.message}</Typography.Text>}
      </div>
    );
  }
  if (wallet.getConnectStatus() === 'connecting') {
    return (
      <div>
        <Space>
          {DisplayWalletName(wallet.name)}
          <SyncOutlined spin />
        </Space>
      </div>
    );
  }
  return (
    <div>
      <Space>
        {DisplayWalletName(wallet.name)}
        <CheckCircleTwoTone />
      </Space>
    </div>
  );
});
