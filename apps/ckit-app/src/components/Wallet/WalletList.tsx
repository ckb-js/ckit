import { SyncOutlined, CheckCircleTwoTone, UsbOutlined } from '@ant-design/icons';
import { AbstractWallet } from '@ckit/base';
import { List, Modal, Space, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { displayWalletName, WalletContainer } from 'containers/WalletContainer';

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
    <Modal
      closable
      title={'choose wallets'}
      width={312}
      visible={visible}
      onCancel={() => setModalVisible(false)}
      footer={null}
    >
      <ModalBorderWrapper>
        <List
          pagination={false}
          dataSource={wallets}
          renderItem={(item, index) => (
            <List.Item
              onClick={() => {
                setError(null);
                if (item.connectStatus === 'disconnected') {
                  item.connect();
                }
                if (item.connectStatus === 'connected') {
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
  if (wallet.connectStatus === 'disconnected') {
    return (
      <div>
        <Space>
          {displayWalletName(wallet.descriptor.name)}
          <UsbOutlined />
        </Space>
        {error && error.index === index && <Typography.Text type="danger"> {error.error.message}</Typography.Text>}
      </div>
    );
  }
  if (wallet.connectStatus === 'connecting') {
    return (
      <div>
        <Space>
          {displayWalletName(wallet.descriptor.name)}
          <SyncOutlined spin />
        </Space>
      </div>
    );
  }
  return (
    <div>
      <Space>
        {displayWalletName(wallet.descriptor.name)}
        <CheckCircleTwoTone />
      </Space>
    </div>
  );
});
