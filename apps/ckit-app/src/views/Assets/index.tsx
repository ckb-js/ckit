import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyledCardWrapper } from 'components/Styled';
import { WalletContainer } from 'containers/WalletContainer';

export const IssueView: React.FC = observer(() => {
  const { selectedWallet } = WalletContainer.useContainer();
  const showIssueView = selectedWallet?.signer;
  return (
    <div>
      <StyledCardWrapper>
        <div style={{ marginBottom: '36px' }}>
          <strong> Assets </strong>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>display-udt-info</div>
      </StyledCardWrapper>
    </div>
  );
});
