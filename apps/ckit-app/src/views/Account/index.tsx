import { Typography, Row, Col } from 'antd';
import React from 'react';
import { StyledCardWrapper } from 'components/Styled';
import { WalletList, WalletChange, WalletConnect } from 'components/Wallet';

export const AccountView: React.FC = () => {
  return (
    <StyledCardWrapper>
      <div style={{ marginBottom: '24px' }}>
        <Row>
          <Col span={12}>
            <Typography.Title level={3}> Account </Typography.Title>
          </Col>
          <Col span={12}>
            <div style={{ float: 'right', paddingTop: '5px' }}>
              <WalletConnect />
            </div>
          </Col>
        </Row>
      </div>
      <WalletList />
      <WalletChange />
    </StyledCardWrapper>
  );
};
