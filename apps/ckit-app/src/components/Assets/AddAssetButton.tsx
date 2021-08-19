import { Hash, HashType, HexString } from '@ckb-lumos/base';
import { Button, ButtonProps, Col, Modal, Row, Typography } from 'antd';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import React, { useState } from 'react';
import { AssetMeta, useAssetMetaStorage } from 'hooks';

interface AddAssetButtonProps extends ButtonProps {
  initialAssetMeta?: Partial<ModalFormValues>;
  buttonContent?: string;
}

export const AddAssetButton: React.FC<AddAssetButtonProps> = (props) => {
  const { initialAssetMeta, buttonContent, ...buttonProps } = props;
  const [visible, setVisible] = useState<boolean>(false);
  return (
    <div>
      <Button {...buttonProps} onClick={() => setVisible(true)}>
        {buttonContent ? buttonContent : ''}
      </Button>
      <ModalForm visible={visible} setVisible={setVisible} initialAssetMeta={initialAssetMeta} />
    </div>
  );
};

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  initialAssetMeta?: Partial<ModalFormValues>;
}

interface ModalFormValues {
  symbol: string;
  decimal: number;
  codeHash: Hash;
  hashType: HashType;
  args: HexString;
}

interface ModalFormErrors {
  symbol?: string;
  decimal?: number;
  codeHash?: Hash;
  hashType?: HashType;
  args?: HexString;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, initialAssetMeta } = props;

  const [assets, setAssets] = useAssetMetaStorage();

  const initialValues: ModalFormValues = {
    symbol: initialAssetMeta?.symbol ? initialAssetMeta.symbol : '',
    decimal: initialAssetMeta?.decimal ? initialAssetMeta.decimal : 8,
    codeHash: initialAssetMeta?.codeHash ? initialAssetMeta.codeHash : '',
    hashType: initialAssetMeta?.hashType ? initialAssetMeta.hashType : 'type',
    args: initialAssetMeta?.args ? initialAssetMeta.args : '',
  };

  const validate = (_values: ModalFormValues): ModalFormErrors => {
    // TODO add validate logic
    return {};
  };

  return (
    <Modal title="Add asset" closable width={312} visible={visible} onCancel={() => setVisible(false)} footer={null}>
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values: ModalFormValues, { setSubmitting }) => {
          const newAssetMeta: AssetMeta = {
            symbol: values.symbol,
            decimal: values.decimal,
            script: {
              code_hash: values.codeHash,
              hash_type: values.hashType,
              args: values.args,
            },
          };
          setAssets(assets.concat(newAssetMeta));
          setSubmitting(false);
          setVisible(false);
        }}
      >
        {(formik) => (
          <Form>
            <div>
              <Row>
                <Col span={8}>
                  <label htmlFor="symbol">symbol:</label>
                </Col>
                <Col span={16}>
                  <Field name="symbol" type="text" />
                </Col>
              </Row>
              <ErrorMessage
                name="symbol"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <Row>
                <Col span={8}>
                  <label htmlFor="decimal">decimal:</label>
                </Col>
                <Col span={16}>
                  <Field name="decimal" type="number" />
                </Col>
              </Row>
              <ErrorMessage
                name="decimal"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <Row>
                <Col span={8}>
                  <label htmlFor="codeHash">code hash:</label>
                </Col>
                <Col span={16}>
                  <Field name="codeHash" type="text" />
                </Col>
              </Row>
              <ErrorMessage
                name="codeHash"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <Row>
                <Col span={8}>
                  <label htmlFor="hashType">hash type:</label>
                </Col>
                <Col span={16}>
                  <Field name="hashType" type="text" />
                </Col>
              </Row>
              <ErrorMessage
                name="hashType"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <Row>
                <Col span={8}>
                  <label htmlFor="args">args:</label>
                </Col>
                <Col span={16}>
                  <Field name="args" type="text" />
                </Col>
              </Row>
              <ErrorMessage
                name="args"
                children={(errorMessage) => {
                  return <Typography.Text type="danger">{errorMessage}</Typography.Text>;
                }}
              />
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Button onClick={formik.submitForm}>submit</Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
