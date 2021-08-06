import { Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { IssueOperation } from 'components/Issue';
import { StyledCardWrapper } from 'components/Styled';
import { WalletContainer } from 'containers/WalletContainer';

export const IssueView: React.FC = observer(() => {
  const { selectedWallet } = WalletContainer.useContainer();
  const showIssueView = selectedWallet?.signer && selectedWallet?.checkSupported('issue-sudt');
  return (
    <div>
      {showIssueView && (
        <StyledCardWrapper>
          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={3}> Issue </Typography.Title>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>display issued udt info</div>
          <IssueOperation />
        </StyledCardWrapper>
      )}
    </div>
  );
});
