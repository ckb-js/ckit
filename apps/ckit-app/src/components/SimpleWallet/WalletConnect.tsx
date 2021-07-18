import { Button, ButtonProps } from 'antd';
import { Signer } from 'ckit';
import React from 'react';
import { useSigner, WalletContainer } from './WalletContainer';

const WalletConnectButton: React.FC<ButtonProps> = (props) => {
  return <Button size="large" type="primary" block {...props} />;
};

export const WalletConnect: React.FC = () => {
  const { connectStatus, connect, signer } = WalletContainer.useContainer();

  if (connectStatus === 'disconnected') {
    return <WalletConnectButton onClick={connect}>Connect</WalletConnectButton>;
  }

  if (connectStatus === 'connecting' || !signer) {
    return <WalletConnectButton loading>Connecting</WalletConnectButton>;
  }

  return <SignerAddress signer={signer} />;
};

const SignerAddress: React.FC<{ signer: Signer }> = ({ signer }) => {
  const { address } = useSigner(signer);

  return <WalletConnectButton>{address}</WalletConnectButton>;
};
