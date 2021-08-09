import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React from 'react';
import { AssetBalance } from './AssetBalance';
import { SendButton } from './SendButton';
import { AssetMeta, useAssetMetaStorage } from 'hooks';

export const AssetList: React.FC = () => {
  const [assetMeta] = useAssetMetaStorage();
  const columns: ColumnsType<AssetMeta> = [
    {
      render: (value, record) => <div>{record.symbol}</div>,
    },
    {
      render: (value, record) => <AssetBalance decimal={record.decimal} script={record.script} />,
    },
    {
      render: (value, record) => <SendButton symbol={record.symbol} decimal={record.decimal} script={record.script} />,
    },
  ];

  return (
    <div>
      <Table size="small" showHeader={false} columns={columns} dataSource={assetMeta} pagination={{ pageSize: 5 }} />
    </div>
  );
};
