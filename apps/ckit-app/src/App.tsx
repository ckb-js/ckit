import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { AppView } from 'views';

import './App.less';

const App: React.FC = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <CkitProviderContainer.Provider>
        <WalletContainer.Provider>
          <AppView />
        </WalletContainer.Provider>
      </CkitProviderContainer.Provider>
    </QueryClientProvider>
  );
};

export default App;
