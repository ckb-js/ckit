import { Empty, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { IssueArea } from 'components/Issue';
import { StyledCardWrapper } from 'components/Styled';
import { useSigner, WalletContainer } from 'containers/WalletContainer';

export const IssueView: React.FC = observer(() => {
  const { selectedWallet } = WalletContainer.useContainer();
  const isSupportIssue = selectedWallet?.checkSupported('issue-sudt');
  const { address: signerAddress } = useSigner(selectedWallet?.signer);

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
