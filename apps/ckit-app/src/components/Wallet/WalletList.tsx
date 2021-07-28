import { SyncOutlined, CheckCircleTwoTone, UsbOutlined } from '@ant-design/icons';
import { AbstractWallet } from '@ckit/base';
import { List, Modal, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { WalletContainer } from 'containers/WalletContainer';

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
  const { wallets, visible, setCurrentWalletIndex, setModalVisible } = WalletContainer.useContainer();

  return (
    <Modal closable width={312} visible={visible} onCancel={() => setModalVisible(false)} footer={null}>
      <ModalBorderWrapper>
        <List
          pagination={false}
          dataSource={wallets}
          renderItem={(item, index) => (
            <List.Item
              onClick={() => {
                if (item.getConnectStatus === 'disconnected') {
                  item.connect();
                }
                if (item.getConnectStatus === 'connected') {
                  setCurrentWalletIndex(index);
                  setModalVisible(false);
                }
              }}
            >
              <WalletListItem wallet={item} />
            </List.Item>
          )}
        />
      </ModalBorderWrapper>
    </Modal>
  );
});

export interface WalletListItemProps {
  wallet: AbstractWallet;
}

export const WalletListItem = observer((props: WalletListItemProps) => {
  const { wallet } = props;
  if (wallet.getConnectStatus === 'disconnected') {
    return (
      <div>
        <Space>
          {wallet.name}
          <UsbOutlined />
        </Space>
      </div>
    );
  }
  if (wallet.getConnectStatus === 'connecting') {
    return (
      <div>
        <Space>
          {wallet.name}
          <SyncOutlined />
        </Space>
      </div>
    );
  }
  return (
    <div>
      <Space>
        {wallet.name}
        <CheckCircleTwoTone />
      </Space>
    </div>
  );
});
