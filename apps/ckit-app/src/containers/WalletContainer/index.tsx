import { AbstractWallet, ConnectStatus } from '@ckit/ckit';
import { autorun, runInAction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createContainer } from 'unstated-next';
import { CkitProviderContainer } from '../CkitProviderContainer';
import { useWalletIndexStorage } from 'hooks';
import { ObservableAcpPwLockWallet, ObservableNonAcpPwLockWallet, ObservableUnipassWallet } from 'wallets';

export interface WalletConnectError {
  error: Error;
  index: number;
}

function useWallet() {
  const ckitProvider = CkitProviderContainer.useContainer();
  const [currentWalletIndex, setCurrentWalletIndex] = useWalletIndexStorage();

  const wallets = useLocalObservable<AbstractWallet[]>(() => [new ObservableUnipassWallet()]);
  const [signerAddress, setSignerAddress] = useState<string>();
  const [error, setError] = useState<WalletConnectError | null>(null);
  const [visible, setVisible] = useState(false);

  const setModalVisible = useCallback((visible: boolean) => {
    setVisible(visible);
    setError(null);
  }, []);

  const selectedWallet =
    currentWalletIndex === null || currentWalletIndex >= wallets.length ? undefined : wallets[currentWalletIndex];
  console.log('s', selectedWallet);

  useEffect(() => {
    if (!ckitProvider) return;
    // when the provider has changed, wallets should be construct with the new provider
    runInAction(() => {
      wallets.splice(1);
      wallets.push(new ObservableNonAcpPwLockWallet(ckitProvider), new ObservableAcpPwLockWallet(ckitProvider));
      if (currentWalletIndex) wallets[currentWalletIndex].connect();
    });
  }, [ckitProvider]);

  console.log('ss');

  useEffect(
    () =>
      autorun(() => {
        if (!wallets) return;
        wallets.forEach((wallet, index) => {
          const onConnectStatusChanged = (connectStatus: ConnectStatus) => {
            if (connectStatus === 'disconnected') {
              const connectedIndex = wallets.findIndex((w) => w.connectStatus === 'connected');
              if (-1 === connectedIndex) {
                setCurrentWalletIndex(null);
              } else {
                setCurrentWalletIndex(connectedIndex);
              }
            }
            if (connectStatus === 'connected') {
              setModalVisible(false);
              const connectedIndex = wallets.findIndex((w) => w.descriptor.name === wallet.descriptor.name);
              if (-1 === connectedIndex) {
                throw new Error('exception: wallet could not be found');
              } else {
                setCurrentWalletIndex(connectedIndex);
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

  console.log('sss');

  useEffect(() => {
    console.log('triggered');
    autorun(() => {
      console.log('b', selectedWallet);
      setSignerAddress(undefined);
      if (currentWalletIndex === null || currentWalletIndex >= wallets.length) return;
      const currentWallet = wallets[currentWalletIndex].signer;
      if (!currentWallet) return;
      void currentWallet.getAddress().then(setSignerAddress);
      console.log('a', selectedWallet);
    });
  }, [currentWalletIndex]);

  return {
    wallets,
    selectedWallet,
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
