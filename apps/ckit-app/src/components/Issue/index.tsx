import { CkbTypeScript } from '@ckit/base';
import React, { useMemo } from 'react';
import { AddAssetButton } from '../Assets';
import { AssetMetaDisplay } from './AssetMetaDisplay';
import { IssueOperation } from './IssueOperation';
import { CkitProviderContainer } from 'containers';
import { AssetMeta, useAssetMetaStorage } from 'hooks';

interface IssueAreaProps {
  issuerAddress: string;
}

export const IssueArea: React.FC<IssueAreaProps> = (props) => {
  const { issuerAddress } = props;
  const provider = CkitProviderContainer.useContainer();
  const { assetsMeta } = useAssetMetaStorage();

  const udtScript = useMemo<CkbTypeScript>(() => {
    if (!provider) throw new Error('excepiton: provider undefined');
    return provider.newSudtScript(issuerAddress);
  }, [provider, issuerAddress]);

  const assetMeta = useMemo<AssetMeta | undefined>(() => {
    return assetsMeta.find(
      (value) =>
        value.script?.hash_type === udtScript.hash_type &&
        value.script.code_hash === udtScript.code_hash &&
        value.script.args === udtScript.args,
    );
  }, [udtScript, assetsMeta]);

  const symbol = assetMeta ? assetMeta.symbol : '?';
  const decimal = assetMeta ? assetMeta.decimal.toString() : '?';

  return (
    <>
      <AssetMetaDisplay symbol={symbol} decimal={decimal} script={udtScript} />
      <div style={{ marginTop: '36px', textAlign: 'center' }}>
        {!assetMeta && (
          <AddAssetButton
            type="primary"
            buttonContent="Add asset info"
            initialAssetMeta={{
              codeHash: udtScript.code_hash,
              hashType: udtScript.hash_type,
              args: udtScript.args,
            }}
          />
        )}
        {assetMeta && <IssueOperation assetMeta={assetMeta} />}
      </div>
    </>
  );
};
