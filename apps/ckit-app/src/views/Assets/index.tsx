import { PlusCircleOutlined } from '@ant-design/icons';
import { Col, Empty, Row, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { AddAssetButton, AssetList } from 'components/Assets';
import { StyledCardWrapper } from 'components/Styled';
import { WalletContainer } from 'containers/WalletContainer';

export const AssetsView: React.FC = observer(() => {
  const { signerAddress } = WalletContainer.useContainer();
  return (
    <div>
      <StyledCardWrapper>
        <div style={{ marginBottom: '12px' }}>
          <Row>
            <Col span={12}>
              <Typography.Title level={3}> Asset </Typography.Title>
            </Col>
            <Col span={12}>
              <div style={{ float: 'right' }}>
                {signerAddress && (
                  <AddAssetButton type="link" size="large" icon={<PlusCircleOutlined style={{ fontSize: '24px' }} />} />
                )}
              </div>
            </Col>
          </Row>
        </div>
        <div>
          {signerAddress && <AssetList />}
          {!signerAddress && <Empty />}
        </div>
      </StyledCardWrapper>
    </div>
  );
});
