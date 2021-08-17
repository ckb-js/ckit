import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript } from '@ckit/base';
import { Button, Col, Modal, Row, Typography } from 'antd';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import React, { useMemo, useState } from 'react';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { AssetMeta, useSendIssueTx, useSendTransferTx } from 'hooks';
import { AssetAmount } from 'utils';

type AssetMetaProps = Pick<AssetMeta, 'symbol' | 'decimal'> & { script: AssetMeta['script'] };

export const SendButton: React.FC<AssetMetaProps> = (props) => {
  const [visible, setVisible] = useState<boolean>(false);
  const provider = CkitProviderContainer.useContainer();
  const { signerAddress } = WalletContainer.useContainer();

  const issuableSudtScript = useMemo<CkbTypeScript>(() => {
    if (!provider) throw new Error('excepiton: provider undefined');
    if (!signerAddress) throw new Error('excepiton: signerAddress undefined');
    return provider.newSudtScript(signerAddress);
  }, [provider, signerAddress]);

  const isMint =
    props.script?.code_hash === issuableSudtScript.code_hash &&
    props.script.hash_type === issuableSudtScript.hash_type &&
    props.script.args === issuableSudtScript.args;

  const buttonContent = isMint ? 'mint' : 'send';

  return (
    <div>
      <Button type="link" onClick={() => setVisible(true)}>
        {buttonContent}
      </Button>
      <ModalForm visible={visible} setVisible={setVisible} assetMeta={props} isMint={isMint} />
    </div>
  );
};

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  assetMeta: AssetMetaProps;
  isMint: boolean;
}

interface ModalFormValues {
  recipient: Address;
  amount: HexNumber;
}

interface ModalFormErrors {
  recipient?: Address;
  amount?: HexNumber;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, assetMeta, isMint } = props;

  const { mutateAsync: sendTransferTransaction, isLoading: isTransferLoading } = useSendTransferTx();
  const { mutateAsync: sendIssueTransaction, isLoading: isIssueLoading } = useSendIssueTx();

  const initialValues: ModalFormValues = { recipient: '', amount: '' };
  const title = (isMint ? 'Mint ' : 'Send ') + assetMeta.symbol;
  const onSubmit = isMint
    ? (values: ModalFormValues) => {
        sendIssueTransaction({
          recipient: values.recipient,
          amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toHexString(),
          operationKind: 'issue',
        }).then(() => setVisible(false));
      }
    : (values: ModalFormValues) => {
        sendTransferTransaction({
          recipient: values.recipient,
          amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toHexString(),
          script: assetMeta.script,
        }).then(() => setVisible(false));
      };
  const loading = isMint ? isIssueLoading : isTransferLoading;

  const validate = (_values: ModalFormValues): ModalFormErrors => {
    // TODO add validate logic
    return {};
  };

  return (
    <Modal title={title} closable width={312} visible={visible} onCancel={() => setVisible(false)} footer={null}>
      <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
        {(formik) => (
          <Form>
            <div>
              <Row>
                <Col span={6}>
                  <label htmlFor="recipient">recipient:</label>
                </Col>
                <Col span={16}>
                  <Field name="recipient" type="text" placeholder="ckb address" />
                </Col>
              </Row>
              <ErrorMessage
                name="recipient"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <Row>
                <Col span={6}>
                  <label htmlFor="amount">amount:</label>
                </Col>
                <Col span={16}>
                  <Field name="amount" type="text" />
                </Col>
              </Row>
              <ErrorMessage
                name="amount"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Button loading={loading} onClick={formik.submitForm}>
                Submit
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
