import { Button, Col, Empty, Row } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useSigner, WalletContainer } from 'containers/WalletContainer';

const NervosExploreUrl = 'https://explorer.nervos.org/aggron/address/';

export const WalletChange = observer(() => {
  const { wallets, currentWalletIndex, setModalVisible } = WalletContainer.useContainer();
  const wallet = currentWalletIndex === null ? undefined : wallets[currentWalletIndex];
  const signer = wallet?.getSigner();
  const { address } = useSigner(signer);
  if (!address) return <Empty />;
  const truncatedAddress = truncateMiddle(address, 6);
  const href = NervosExploreUrl + address;
  return (
    <div style={{ marginTop: '56px', marginBottom: '24px', textAlign: 'center' }}>
      <Row>
        <Col span={8} />
        <Col span={8}>
          <a href={href} target="_blank" rel="noreferrer">
            {truncatedAddress}
          </a>
        </Col>
        <Col span={8}>
          <Button size="small" onClick={() => setModalVisible(true)}>
            change
          </Button>
        </Col>
      </Row>
    </div>
  );
});

function truncateMiddle(str: string, start: number, end = start): string {
  if (!start || !end || start <= 0 || end <= 0) throw new Error('start or end is invalid');
  if (str.length <= start + end) return str;
  return str.slice(0, start) + '...' + str.slice(-end);
}
