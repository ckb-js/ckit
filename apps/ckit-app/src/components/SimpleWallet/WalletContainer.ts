import { Transaction } from '@ckb-lumos/base';
import { Wallet, ConnectStatus, Signer } from 'ckit';
import { useCallback, useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';

function useWallet() {
  const [wallet, setWallet] = useState<Wallet>();
  const [signer, setSigner] = useState<Signer>();
  const [error, setError] = useState<Error>();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('disconnected');

  const connect = useCallback(() => {
    if (!wallet) return;
    wallet.connect();
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return;

    wallet.on('connectStatusChanged', setConnectStatus);
    wallet.on('signerChanged', setSigner);
    wallet.on('error', (err) => setError(err as Error));

    return () => wallet?.disconnect?.();
  }, [wallet]);

  return { connectStatus, setWallet, signer, error, connect };
}

interface SignerType {
  address: string | undefined;
  sign: (tx: Transaction) => Promise<Transaction>;
}

export function useSigner(signer: Signer): SignerType {
  const [address, setAddress] = useState<string>();

  useEffect(() => {
    setAddress(undefined);
    void signer.getAddress().then(setAddress);
  }, [signer]);

  return { address, sign: signer.sign.bind(signer) };
}

export const WalletContainer = createContainer(useWallet);
