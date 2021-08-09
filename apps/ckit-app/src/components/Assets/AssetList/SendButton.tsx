import { Address, HexNumber } from '@ckb-lumos/base';
import { Button, Col, Modal, Row, Typography } from 'antd';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import React, { useState } from 'react';
import { AssetMeta, useSendTransferTx } from 'hooks';
import { AssetAmount } from 'utils';

type AssetMetaProps = Pick<AssetMeta, 'symbol' | 'decimal'> & { script: AssetMeta['script'] };

export const SendButton: React.FC<AssetMetaProps> = (props) => {
  const [visible, setVisible] = useState<boolean>(false);
  return (
    <div>
      <Button type="link" onClick={() => setVisible(true)}>
        send
      </Button>
      <ModalForm visible={visible} setVisible={setVisible} assetMeta={props} />
    </div>
  );
};

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  assetMeta: AssetMetaProps;
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
  const { visible, setVisible, assetMeta } = props;

  const { mutateAsync: sendTransferTransaction, isLoading: isIssueLoading } = useSendTransferTx();

  const initialValues: ModalFormValues = { recipient: '', amount: '' };
  const title = 'Send ' + assetMeta.symbol;

  const validate = (_values: ModalFormValues): ModalFormErrors => {
    // TODO add validate logic
    return {};
  };

  return (
    <Modal title={title} closable width={312} visible={visible} onCancel={() => setVisible(false)} footer={null}>
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values: ModalFormValues, { setSubmitting }) => {
          sendTransferTransaction({
            recipient: values.recipient,
            amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toRawString(),
            script: assetMeta.script,
          }).then(() => setVisible(false));
        }}
      >
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
              <Button loading={isIssueLoading} onClick={formik.submitForm}>
                Submit
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
