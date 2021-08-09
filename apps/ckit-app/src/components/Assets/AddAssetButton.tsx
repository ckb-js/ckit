import { PlusCircleOutlined } from '@ant-design/icons';
import { Hash, HashType, HexString } from '@ckb-lumos/base';
import { Button, Col, Modal, Row, Typography } from 'antd';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import React, { useState } from 'react';
import { AssetMeta, useAssetMetaStorage } from 'hooks';

export const AddAssetButton: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  return (
    <div>
      <Button
        type="link"
        size="large"
        icon={<PlusCircleOutlined style={{ fontSize: '20px' }} />}
        onClick={() => setVisible(true)}
      />
      <ModalForm visible={visible} setVisible={setVisible} />
    </div>
  );
};

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
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
  const { visible, setVisible } = props;

  const [assets, setAssets] = useAssetMetaStorage();

  const initialValues: ModalFormValues = { symbol: '', decimal: 8, codeHash: '', hashType: 'type', args: '' };
  const title = 'Add asset';

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
              <Button onClick={formik.submitForm}>Submit</Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};
