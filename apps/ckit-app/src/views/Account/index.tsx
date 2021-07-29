import React from 'react';
import { StyledCardWrapper } from 'components/Styled';
import { WalletList, WalletChange, WalletConnect } from 'components/Wallet';

export const AccountView: React.FC = () => {
  return (
    <StyledCardWrapper>
      <div style={{ marginBottom: '36px' }}>
        <strong> Account </strong>
        <span style={{ float: 'right' }}>
          <WalletConnect />
        </span>
      </div>
      <WalletList />
      <WalletChange />
    </StyledCardWrapper>
  );
};
