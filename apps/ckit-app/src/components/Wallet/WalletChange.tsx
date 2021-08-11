import { Button, Col, Empty, Row, Tooltip, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { WalletContainer } from 'containers/WalletContainer';
import { useConfigStorage } from 'hooks';
import { truncateMiddle } from 'utils';

export const WalletChange = observer(() => {
  const { signerAddress, setModalVisible } = WalletContainer.useContainer();
  const [localConfig] = useConfigStorage();
  if (!signerAddress) return <Empty />;
  const truncatedAddress = truncateMiddle(signerAddress, 8);
  const href = localConfig.nervosExploreAddressUrlPrefix + signerAddress;
  return (
    <div style={{ marginTop: '32px', marginBottom: '32px' }}>
      <Row>
        <Col span={8} offset={6}>
          <div style={{ textAlign: 'center' }}>
            <Tooltip title={<AddressTip copyable>{signerAddress}</AddressTip>}>
              <a href={href} target="_blank" rel="noreferrer">
                {truncatedAddress}
              </a>
            </Tooltip>
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

const AddressTip = styled(Typography.Text)`
  color: #ffffff;
`;
