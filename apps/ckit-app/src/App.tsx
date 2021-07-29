import React from 'react';
import styled from 'styled-components';
import { WalletContainer } from 'containers/WalletContainer';
import { AccountView } from 'views/Account';

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
  return (
    <WalletContainer.Provider>
      <BodyWrapper>
        <div className="app">
          <AccountView />
        </div>
      </BodyWrapper>
    </WalletContainer.Provider>
  );
};

export default App;
