import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript } from '@ckit/base';
import { Button, Col, Input, Modal, Row, Typography } from 'antd';
import { useFormik } from 'formik';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { CkitProviderContainer, WalletContainer } from 'containers';
import { AssetMeta, useFormValidate, useSendIssueTx, useSendTransferTx } from 'hooks';
import { AssetAmount } from 'utils';

type AssetMetaProps = Pick<AssetMeta, 'symbol' | 'decimal'> & { script: AssetMeta['script'] };

export const SendButton: React.FC<AssetMetaProps> = (props) => {
  const { script, decimal } = props;
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

  const query = useQuery(
    ['queryBalance', { script: script, address: signerAddress }],
    () => {
      if (!provider || !signerAddress) throw new Error('exception: signer should exist');
      if (script) {
        return provider.getUdtBalance(signerAddress, script);
      }
      return provider.getCkbLiveCellsBalance(signerAddress);
    },
    {
      enabled: !!signerAddress,
    },
  );

  const disabled =
    query.isLoading || query.isError || !query.data || AssetAmount.fromRaw(query.data, decimal).rawAmount.eq(0);

  return (
    <div>
      <Button type="link" disabled={disabled} onClick={() => setVisible(true)}>
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
  recipient?: string;
  amount?: string;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, assetMeta, isMint } = props;

  const { validateCkbAddress, validateIssueAddress, validateTransferAddress, validateAmount } = useFormValidate();
  const { mutateAsync: sendTransferTransaction, isLoading: isTransferLoading } = useSendTransferTx();
  const { mutateAsync: sendIssueTransaction, isLoading: isIssueLoading } = useSendIssueTx();

  const initialValues: ModalFormValues = { recipient: '', amount: '' };
  const title = (isMint ? 'Mint ' : 'Send ') + assetMeta.symbol;
  const onSubmit = useCallback(
    (values: ModalFormValues) => {
      if (isMint) {
        sendIssueTransaction({
          recipient: values.recipient,
          amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toRawString(),
          operationKind: 'issue',
        }).then(() => setVisible(false));
      } else {
        sendTransferTransaction({
          recipient: values.recipient,
          amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toRawString(),
          script: assetMeta.script,
        }).then(() => setVisible(false));
      }
    },
    [isMint, sendIssueTransaction, sendTransferTransaction, assetMeta, setVisible],
  );
  const loading = isMint ? isIssueLoading : isTransferLoading;

  const validate = async (values: ModalFormValues): Promise<ModalFormErrors> => {
    const errors: ModalFormErrors = {};
    if (isMint) {
      // issue sudt
      if (!assetMeta.script) throw new Error('exception: issued sudt should have script');
      const recipientError = await validateIssueAddress(values.recipient, assetMeta.script);
      if (recipientError) errors.recipient = recipientError;
    } else {
      if (assetMeta.script) {
        // transfer sudt
        const recipientError = await validateTransferAddress(values.recipient, assetMeta.script);
        if (recipientError) errors.recipient = recipientError;
      } else {
        // transfer ckb
        const recipientError = await validateCkbAddress(values.recipient);
        if (recipientError) errors.recipient = recipientError;
      }
    }
    const amountError = validateAmount(values.amount, assetMeta.decimal);
    if (amountError) errors.amount = amountError;
    return errors;
  };

  const formik = useFormik({
    initialValues,
    validate,
    onSubmit,
  });

  const onCancel = useCallback(() => {
    formik.resetForm();
    setVisible(false);
  }, [formik, setVisible]);

  return (
    <Modal title={title} closable width={312} visible={visible} onCancel={onCancel} footer={null}>
      <div>
        <Row justify="center" align="middle">
          <Col span={7}>
            <label htmlFor="recipient">recipient</label>
          </Col>
          <Col span={16}>
            <Input id="recipient" placeholder="ckb address" {...formik.getFieldProps('recipient')} />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.recipient && formik.errors.recipient && (
              <Typography.Text type="danger">{formik.errors.recipient}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Row justify="center" align="middle">
          <Col span={7}>
            <label htmlFor="amount">amount:</label>
          </Col>
          <Col span={16}>
            <Input id="amount" {...formik.getFieldProps('amount')} />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.amount && formik.errors.amount && (
              <Typography.Text type="danger">{formik.errors.amount}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Button loading={loading} onClick={formik.submitForm}>
          submit
        </Button>
      </div>
    </Modal>
  );
};
