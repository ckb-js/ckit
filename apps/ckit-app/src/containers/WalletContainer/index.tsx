import { AbstractWallet, ConnectStatus } from '@ckit/ckit';
import { useLocalStorage } from '@rehooks/local-storage';
import { autorun, runInAction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import { CkitProviderContainer } from '../CkitProviderContainer';
import { ObservableAcpPwLockWallet, ObservableNonAcpPwLockWallet, ObservableUnipassWallet } from 'wallets';

export interface WalletConnectError {
  error: Error;
  index: number;
}

function useWallet() {
  const ckitProvider = CkitProviderContainer.useContainer();
  const [currentWalletName, setCurrentWalletName] = useLocalStorage<string | null>('currentWalletName');

  // TODO refactor to Wallets class
  const wallets = useLocalObservable<AbstractWallet[]>(() => []);
  const [signerAddress, setSignerAddress] = useState<string>();
  const [error, setError] = useState<WalletConnectError | null>(null);
  const [visible, setVisible] = useState(false);

  const setModalVisible = useCallback((visible: boolean) => {
    setVisible(visible);
    setError(null);
  }, []);

  useEffect(() => {
    if (!ckitProvider) return;
    // when the provider has changed, wallets should be construct with the new provider
    runInAction(() => {
      wallets.splice(0);
      wallets.push(
        new ObservableUnipassWallet(ckitProvider),
        new ObservableNonAcpPwLockWallet(ckitProvider),
        new ObservableAcpPwLockWallet(ckitProvider),
      );
      wallets.find((value) => value.descriptor.name === currentWalletName)?.connect();
    });
  }, [ckitProvider]);

  useEffect(
    () =>
      autorun(() => {
        if (!wallets) return;
        wallets.forEach((wallet, index) => {
          const onConnectStatusChanged = (connectStatus: ConnectStatus) => {
            if (connectStatus === 'disconnected') {
              const remainConnectedWallet = wallets.find((w) => w.connectStatus === 'connected');
              if (!remainConnectedWallet) {
                setCurrentWalletName(null);
              } else {
                setCurrentWalletName(remainConnectedWallet.descriptor.name);
              }
            }
            if (connectStatus === 'connected') {
              setModalVisible(false);
              const connectedWallet = wallets.find((w) => w.descriptor.name === wallet.descriptor.name);
              if (!connectedWallet) {
                throw new Error('exception: wallet could not be found');
              } else {
                setCurrentWalletName(connectedWallet.descriptor.name);
              }
            }
          };
          wallet.on('connectStatusChanged', onConnectStatusChanged);
          wallet.on('error', (err) =>
            setError({
              error: err as Error,
              index: index,
            }),
          );
        });
      }),
    [setModalVisible, wallets],
  );

  const currentWallet = wallets.find((value) => value.descriptor.name === currentWalletName);

  useEffect(() => {
    autorun(() => {
      setSignerAddress(undefined);
      const wallet = wallets.find((value) => value.descriptor.name === currentWalletName);
      void wallet?.signer?.getAddress().then(setSignerAddress);
    });
  }, [currentWalletName]);

  return {
    wallets,
    currentWallet,
    setCurrentWalletName,
    signerAddress,
    error,
    setError,
    visible,
    setModalVisible,
  };
}

export const WalletContainer = createContainer(useWallet);

export const displayWalletName = (name: string | undefined): string => {
  return name || 'unknown';
};
