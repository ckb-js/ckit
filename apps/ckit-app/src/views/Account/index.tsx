import React from 'react';
import { StyledCardWrapper } from 'components/Styled';
import { WalletList, WalletChange, WalletConnect } from 'components/Wallet';

export const AccountView: React.FC = () => {
  return (
    <StyledCardWrapper>
      <p style={{ marginBottom: '36px' }}>
        <strong> Account </strong>
        <span style={{ float: 'right' }}>
          <WalletConnect />
        </span>
      </p>
      <WalletList />
      <WalletChange />
    </StyledCardWrapper>
  );
};
