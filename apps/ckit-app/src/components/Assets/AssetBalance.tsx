import { LoadingOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import React from 'react';
import { useQuery } from 'react-query';
import { CkitProviderContainer, useSigner, WalletContainer } from 'containers';
import { AssetMeta } from 'hooks';
import { humanizeAssetAmount } from 'utils';

export const AssetBalance: React.FC<AssetMeta> = (props) => {
  const { script, precision } = props;
  const ckitProvider = CkitProviderContainer.useContainer();
  const { selectedWallet } = WalletContainer.useContainer();
  const { address } = useSigner(selectedWallet?.signer);
  const query = useQuery(['queryBalance', script, address], () => {
    if (!ckitProvider || !address) throw new Error('exception: signer should exist');
    if (script) {
      return ckitProvider.getUdtBalance(address, script);
    }
    return ckitProvider.getCkbLiveCellsBalance(address);
  });
  if (query.isError) {
    return <Typography.Text type="danger">error</Typography.Text>;
  }
  if (query.data) {
    return <Typography.Text>{humanizeAssetAmount(query.data, precision)}</Typography.Text>;
  }
  return <LoadingOutlined />;
};
