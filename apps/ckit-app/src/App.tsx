import { ScriptConfig } from '@ckb-lumos/config-manager';
import { UnipassWallet, NonAcpPwLockWallet } from 'ckit';
import { CkitConfig, CkitProvider } from 'ckit/dist/providers/CkitProvider';
import { randomHexString } from 'ckit/dist/utils';
import React, { useEffect, useMemo } from 'react';
import { WalletContainer, WalletConnect } from 'components/SimpleWallet';
import './App.less';

const WalletView: React.FC = () => {
  const { setWallet } = WalletContainer.useContainer();

  const whichWallet = useMemo<'unipass' | 'pw'>(() => {
    return 'pw';
  }, []);

  useEffect(() => {
    const provider = new CkitProvider();
    const randomScriptConfig = (): ScriptConfig => ({
      HASH_TYPE: 'type',
      DEP_TYPE: 'code',
      CODE_HASH: randomHexString(64),
      TX_HASH: randomHexString(64),
      INDEX: '0x0',
    });

    const config: CkitConfig = {
      PREFIX: 'ckt',
      SCRIPTS: {
        ALWAYS_SUCCESS: randomScriptConfig(),
        ANYONE_CAN_PAY: randomScriptConfig(),
        PW_NON_ANYONE_CAN_PAY: randomScriptConfig(),
        PW_ANYONE_CAN_PAY: randomScriptConfig(),
        SECP256K1_BLAKE160: randomScriptConfig(),
        SUDT: randomScriptConfig(),
      },
    };

    if (whichWallet === 'unipass') setWallet(new UnipassWallet());
    if (whichWallet === 'pw') void provider.init(config).then(() => setWallet(new NonAcpPwLockWallet(provider)));
  }, [setWallet, whichWallet]);

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
