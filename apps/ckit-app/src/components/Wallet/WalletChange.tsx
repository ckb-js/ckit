import { Button, Col, Empty, Row } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useSigner, WalletContainer } from 'containers/WalletContainer';
import { useConfigStorage } from 'hooks';

export const WalletChange = observer(() => {
  const { selectedWallet, setModalVisible } = WalletContainer.useContainer();
  const [localConfig] = useConfigStorage();
  const { address } = useSigner(selectedWallet?.signer);
  if (!address) return <Empty />;
  const truncatedAddress = truncateMiddle(address, 8);
  const href = localConfig.nervosExploreAddressUrlPrefix + address;
  return (
    <div style={{ marginTop: '32px', marginBottom: '32px' }}>
      <Row>
        <Col span={8} offset={6}>
          <div style={{ textAlign: 'center' }}>
            <a href={href} target="_blank" rel="noreferrer">
              {truncatedAddress}
            </a>
          </div>
        </Col>
        <Col span={8} offset={2}>
          <div style={{ float: 'right' }}>
            <Button size="small" onClick={() => setModalVisible(true)}>
              change
            </Button>
          </div>
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
