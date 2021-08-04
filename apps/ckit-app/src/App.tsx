import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import styled from 'styled-components';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { AccountView, AssetsView, IssueView } from 'views';

import './App.less';

const BodyWrapper = styled.div`
  padding-bottom: 32px;
  min-height: 100vh;
  background: linear-gradient(111.44deg, #a6ded2 0%, #8c99c2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const App: React.FC = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <CkitProviderContainer.Provider>
        <WalletContainer.Provider>
          <BodyWrapper>
            <div className="app">
              <AccountView />
              <IssueView />
              <AssetsView />
            </div>
          </BodyWrapper>
        </WalletContainer.Provider>
      </CkitProviderContainer.Provider>
    </QueryClientProvider>
  );
};

export default App;
