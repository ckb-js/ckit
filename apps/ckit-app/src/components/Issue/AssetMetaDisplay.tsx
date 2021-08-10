import { utils } from '@ckb-lumos/base';
import { CkbTypeScript } from '@ckit/base';
import { Tooltip, Typography, List, Row, Col } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useConfigStorage } from 'hooks';
import { truncateMiddle } from 'utils';

interface AssetMetaDisplayProps {
  symbol: string;
  decimal: string;
  script: CkbTypeScript;
}

export const AssetMetaDisplay: React.FC<AssetMetaDisplayProps> = (props) => {
  const { symbol, decimal, script } = props;
  const [localConfig] = useConfigStorage();

  const scriptHash = utils.computeScriptHash(script);
  const data = [
    { index: 0, key: 'symbol: ', value: symbol },
    { index: 1, key: 'decimal: ', value: decimal },
    { index: 2, key: 'script hash: ', value: scriptHash },
  ];
  return (
    <List
      size="large"
      style={{ marginTop: '24px' }}
      dataSource={data}
      renderItem={(item) => {
        if (item.index !== 2) {
          return (
            <Row>
              <Col span={8}>
                <Typography.Text>{item.key}</Typography.Text>
              </Col>
              <Col span={16}>
                <Typography.Text>{item.value}</Typography.Text>
              </Col>
            </Row>
          );
        }
        return (
          <Row>
            <Col span={8}>
              <Typography.Text>{item.key}</Typography.Text>
            </Col>
            <Col span={16}>
              <Tooltip title={<ScriptTip copyable>{JSON.stringify(script)}</ScriptTip>}>
                <Typography.Link
                  href={localConfig.nervosExploreSudtUrlPrefix + item.value}
                  target="_blank"
                  rel="noreferrer"
                >
                  {truncateMiddle(item.value, 10)}
                </Typography.Link>
              </Tooltip>
            </Col>
          </Row>
        );
      }}
    />
  );
};

const ScriptTip = styled(Typography.Text)`
  color: #ffffff;
`;
