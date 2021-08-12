import { autorun } from 'mobx';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { AccountView } from './Account';
import { AssetsView } from './Assets';
import { IssueView } from './Issue';
import { WalletContainer } from 'containers';
import { useWalletIndexStorage } from 'hooks';

export const AppView: React.FC = () => {
  // const [currentWalletIndex] = useWalletIndexStorage();
  // const { wallets } = WalletContainer.useContainer();
  //
  // useEffect(
  //   () =>
  //     autorun(() => {
  //       if (!currentWalletIndex || currentWalletIndex >= wallets.length) return;
  //       wallets[currentWalletIndex].connect();
  //     }),
  //   [],
  // );

  return (
    <BodyWrapper>
      <div className="app">
        <AccountView />
        <IssueView />
        <AssetsView />
      </div>
    </BodyWrapper>
  );
};

const BodyWrapper = styled.div`
  padding-bottom: 32px;
  min-height: 100vh;
  background: linear-gradient(111.44deg, #a6ded2 0%, #8c99c2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`;
