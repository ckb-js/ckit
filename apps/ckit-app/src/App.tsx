import { dummy } from 'ckit';
import React, { useEffect } from 'react';
import { WalletContainer, WalletConnect } from 'components/SimpleWallet';

import './App.less';

const WalletView: React.FC = () => {
  const { setWallet } = WalletContainer.useContainer();

  useEffect(() => {
    setWallet(new dummy.DummyWallet());
  }, [setWallet]);

  return <WalletConnect />;
};

const App: React.FC = () => {
  return (
    <WalletContainer.Provider>
      <div className="app">
        <WalletView />
      </div>
    </WalletContainer.Provider>
  );
};

export default App;
