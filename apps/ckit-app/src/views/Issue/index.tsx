import { Empty, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { IssueArea } from 'components/Issue';
import { StyledCardWrapper } from 'components/Styled';
import { WalletContainer } from 'containers/WalletContainer';

export const IssueView: React.FC = observer(() => {
  const { currentWallet, signerAddress } = WalletContainer.useContainer();
  const isSupportIssue = currentWallet?.checkSupported('issue-sudt');

  return (
    <div>
      {isSupportIssue && (
        <StyledCardWrapper>
          <div>
            <Typography.Title level={3}> Issue </Typography.Title>
          </div>
          {!signerAddress && <Empty />}
          {signerAddress && <IssueArea issuerAddress={signerAddress} />}
        </StyledCardWrapper>
      )}
    </div>
  );
});
