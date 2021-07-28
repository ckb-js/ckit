import { AbstractWallet, ConnectStatus, Signer, dummy } from 'ckit';
import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';

export type CurrentWalletIndex = number | null;

function useWallet() {
  const [wallets] = useState<AbstractWallet[]>([new dummy.DummyWallet('dummy 1'), new dummy.DummyWallet('dummy 2')]);
  // const [signer, setSigner] = useState<Signer>();
  const [error, setError] = useState<Error>();
  const [currentWalletIndex, setCurrentWalletIndex] = useState<CurrentWalletIndex>(null);
  const [visible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!wallets) return;
    for (const wallet of wallets) {
      const onConnectStatusChanged = (connectStatus: ConnectStatus) => {
        if (connectStatus === 'disconnected') {
          const connectedIndex = wallets.findIndex((w) => w.getConnectStatus === 'connected');
          if (-1 === connectedIndex) {
            setCurrentWalletIndex(null);
          } else {
            setCurrentWalletIndex(connectedIndex);
          }
        }
        if (connectStatus === 'connected') {
          setModalVisible(false);
          const connectedIndex = wallets.findIndex((w) => w.name === wallet.name);
          if (-1 === connectedIndex) {
            throw new Error('exception: wallet could not be found');
          } else {
            setCurrentWalletIndex(connectedIndex);
          }
        }
      };
      wallet.on('connectStatusChanged', onConnectStatusChanged);
      // wallet.on('signerChanged', setSigner);
      wallet.on('error', (err) => setError(err as Error));
    }
  }, [wallets]);

  return { currentWalletIndex, setCurrentWalletIndex, wallets, error, setError, visible, setModalVisible };
}

interface SignerAddress {
  address: string | undefined;
}

export function useSigner(signer: Signer | undefined): SignerAddress {
  const [address, setAddress] = useState<string>();

  useEffect(() => {
    setAddress(undefined);
    if (!signer) return;
    void signer.getAddress().then(setAddress);
  }, [signer]);

  return { address };
}

export const WalletContainer = createContainer(useWallet);
