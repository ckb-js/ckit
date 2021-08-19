import { Hash, HashType, HexString } from '@ckb-lumos/base';
import { Button, ButtonProps, Col, Input, InputNumber, Modal, Radio, Row, Typography } from 'antd';
import { useFormik } from 'formik';
import React, { useCallback, useState } from 'react';
import { AssetMeta, useAssetMetaStorage } from 'hooks';
import { isValidHexString } from 'utils';

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
  decimal?: string;
  codeHash?: string;
  hashType?: string;
  args?: string;
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

  const validate = (values: ModalFormValues): ModalFormErrors => {
    const errors: ModalFormErrors = {};
    if (!values.symbol) {
      errors.symbol = 'symbol required';
    }
    if (values.decimal <= 0) {
      errors.decimal = 'decimal should be greater than 0';
    }
    if (!isValidHexString(values.codeHash)) {
      errors.codeHash = 'invalid hex string';
    }
    if (!isValidHexString(values.args)) {
      errors.args = 'invalid hex string';
    }
    return errors;
  };

  const formik = useFormik({
    initialValues,
    validate,
    onSubmit: (values: ModalFormValues, { setSubmitting }) => {
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
    },
  });

  const onCancel = useCallback(() => {
    formik.resetForm();
    setVisible(false);
  }, [formik, setVisible]);

  return (
    <Modal title="Add asset" closable width={312} visible={visible} onCancel={onCancel} footer={null}>
      <div>
        <Row align="middle">
          <Col span={8}>
            <label htmlFor="symbol">symbol:</label>
          </Col>
          <Col span={16}>
            <Input id="symbol" {...formik.getFieldProps('symbol')} />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.symbol && formik.errors.symbol && (
              <Typography.Text type="danger">{formik.errors.symbol}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Row align="middle">
          <Col span={8}>
            <label htmlFor="decimal">decimal:</label>
          </Col>
          <Col span={16}>
            <InputNumber
              id="decimal"
              onChange={(value) => {
                void formik.setFieldValue('decimal', value, true);
              }}
              onBlur={formik.handleBlur}
              value={formik.values.decimal}
            />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.decimal && formik.errors.decimal && (
              <Typography.Text type="danger">{formik.errors.decimal}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Row align="middle">
          <Col span={8}>
            <label htmlFor="codeHash">code hash:</label>
          </Col>
          <Col span={16}>
            <Input id="codeHash" {...formik.getFieldProps('codeHash')} />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.codeHash && formik.errors.codeHash && (
              <Typography.Text type="danger">{formik.errors.codeHash}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Row align="middle">
          <Col span={8}>
            <label htmlFor="hashType">hash type:</label>
          </Col>
          <Col span={16}>
            <Radio.Group id="hashType" name="hashType" onChange={formik.handleChange} value={formik.values.hashType}>
              <Radio value="type">type</Radio>
              <Radio value="data">data</Radio>
            </Radio.Group>
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.hashType && formik.errors.hashType && (
              <Typography.Text type="danger">{formik.errors.hashType}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Row align="middle">
          <Col span={8}>
            <label htmlFor="args">args:</label>
          </Col>
          <Col span={16}>
            <Input id="args" {...formik.getFieldProps('args')} />
          </Col>
        </Row>
        <Row>
          <Col offset={8}>
            {formik.touched.args && formik.errors.args && (
              <Typography.Text type="danger">{formik.errors.args}</Typography.Text>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Button onClick={formik.submitForm}>submit</Button>
      </div>
    </Modal>
  );
};
