import { LoadingOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import React from 'react';
import { useQuery } from 'react-query';
import { CkitProviderContainer, useSigner, WalletContainer } from 'containers';
import { AssetMeta } from 'hooks';
import { AssetAmount } from 'utils';

type AssetBalanceProps = Pick<AssetMeta, 'decimal'> & { script: AssetMeta['script'] };

export const AssetBalance: React.FC<AssetBalanceProps> = (props) => {
  const { script, decimal } = props;
  const ckitProvider = CkitProviderContainer.useContainer();
  const { selectedWallet } = WalletContainer.useContainer();
  const { address } = useSigner(selectedWallet?.signer);
  const query = useQuery(
    ['queryBalance', script, address],
    () => {
      if (!ckitProvider || !address) throw new Error('exception: signer should exist');
      if (script) {
        return ckitProvider.getUdtBalance(address, script);
      }
      return ckitProvider.getCkbLiveCellsBalance(address);
    },
    {
      enabled: !!address,
    },
  );
  if (query.isError) {
    return <Typography.Text type="danger">error</Typography.Text>;
  }
  if (query.data) {
    return <Typography.Text>{AssetAmount.fromRaw(query.data, decimal).toHumanizeString()}</Typography.Text>;
  }
  return <LoadingOutlined />;
};
