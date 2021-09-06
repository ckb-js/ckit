import { utils } from '@ckb-lumos/base';
import { CkbTypeScript } from '@ckitjs/base';
import { Tooltip, Typography, Row, Col } from 'antd';
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

  return (
    <div style={{ marginTop: '24px' }}>
      <Row>
        <Col span={7} offset={3}>
          <Typography.Text>symbol:</Typography.Text>
        </Col>
        <Col span={14}>
          <Typography.Text>{symbol}</Typography.Text>
        </Col>
      </Row>
      <Row style={{ marginTop: '8px' }}>
        <Col span={7} offset={3}>
          <Typography.Text>decimal:</Typography.Text>
        </Col>
        <Col span={14}>
          <Typography.Text>{decimal}</Typography.Text>
        </Col>
      </Row>
      <Row style={{ marginTop: '8px' }}>
        <Col span={7} offset={3}>
          <Typography.Text>script hash:</Typography.Text>
        </Col>
        <Col span={14}>
          <Tooltip title={<ScriptTip copyable>{JSON.stringify(script)}</ScriptTip>}>
            <Typography.Link
              href={localConfig.nervosExploreSudtUrlPrefix + scriptHash}
              target="_blank"
              rel="noreferrer"
            >
              {truncateMiddle(scriptHash, 8)}
            </Typography.Link>
          </Tooltip>
        </Col>
      </Row>
    </div>
  );
};

const ScriptTip = styled(Typography.Text)`
  color: #ffffff;
`;
