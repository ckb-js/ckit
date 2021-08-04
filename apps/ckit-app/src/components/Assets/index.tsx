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
      render: (value, record) => <div>{record.name}</div>,
    },
    {
      render: (value, record) => (
        <AssetBalance name={record.name} precision={record.precision} script={record.script} />
      ),
    },
    {
      render: (value, record) => <SendButton name={record.name} precision={record.precision} script={record.script} />,
    },
  ];

  return (
    <div>
      <Table size="small" showHeader={false} columns={columns} dataSource={assetMeta} />
    </div>
  );
};
