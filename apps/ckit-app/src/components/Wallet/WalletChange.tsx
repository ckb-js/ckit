import { Button, Empty, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useSigner, WalletContainer } from 'containers/WalletContainer';

const NervosExploreUrl = 'https://explorer.nervos.org/aggron/address/';

export const WalletChange = observer(() => {
  const { wallets, currentWalletIndex, setModalVisible } = WalletContainer.useContainer();
  const wallet = currentWalletIndex === null ? undefined : wallets[currentWalletIndex];
  const signer = wallet?.getSigner;
  const { address } = useSigner(signer);
  if (!address) return <Empty />;
  const truncatedAddress = truncateMiddle(address, 6);
  const href = NervosExploreUrl + address;
  return (
    <div style={{ marginTop: '50px', marginBottom: '30px', textAlign: 'center' }}>
      <Space>
        <span style={{ margin: '0 auto', display: 'inline-block' }}>
          <a href={href} target="_blank" rel="noreferrer">
            {truncatedAddress}
          </a>
        </span>
        <Button size="small" onClick={() => setModalVisible(true)}>
          change
        </Button>
      </Space>
    </div>
  );
});

function truncateMiddle(str: string, start: number, end = start): string {
  if (!start || !end || start <= 0 || end <= 0) throw new Error('start or end is invalid');
  if (str.length <= start + end) return str;
  return str.slice(0, start) + '...' + str.slice(-end);
}
