import { Address, HexNumber } from '@ckb-lumos/base';
import { Button, Col, Input, Modal, Row, Typography, Select } from 'antd';
import { useFormik } from 'formik';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';
import { AssetMeta, useFormValidate, useSendIssueTx } from 'hooks';
import { AssetAmount } from 'utils';

type OperationKind = 'invite' | 'issue';

interface IssueOperationProps {
  assetMeta: AssetMeta;
}

export const IssueOperation = observer((props: IssueOperationProps) => {
  const { assetMeta } = props;
  const [visible, setVisible] = useState<boolean>(false);
  const [operationKind, setOperationKind] = useState<OperationKind>('invite');

  const onClickInvite = () => {
    setOperationKind('invite');
    setVisible(true);
  };
  const onClickIssue = () => {
    setOperationKind('issue');
    setVisible(true);
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <Row>
        <Col span={4} offset={4}>
          <Button onClick={onClickInvite}>invite</Button>
        </Col>
        <Col span={4} offset={8}>
          <Button onClick={onClickIssue}>issue</Button>
        </Col>
      </Row>
      <ModalForm visible={visible} setVisible={setVisible} operationKind={operationKind} assetMeta={assetMeta} />
    </div>
  );
});

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  operationKind: OperationKind;
  assetMeta: AssetMeta;
}

interface ModalFormValues {
  inviteRecipient: Address;
  issueRecipient: Address;
  issuePolicy: 'findAcp' | 'createCell';
  amount: HexNumber;
}

interface ModalFormErrors {
  inviteRecipient?: string;
  issueRecipient?: string;
  amount?: string;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, operationKind, assetMeta } = props;

  const { validateInviteAddress, validateIssueAcpAddress, validateAmount } = useFormValidate();
  const { mutateAsync: sendIssueTransaction, isLoading: isIssueLoading } = useSendIssueTx();

  const initialValues: ModalFormValues = {
    inviteRecipient: '',
    issueRecipient: '',
    amount: '',
    issuePolicy: 'findAcp',
  };
  const title = operationKind === 'invite' ? 'Invite user' : 'Issue ' + assetMeta.symbol;
  const recipientFieldDisplayName = operationKind === 'invite' ? 'user:' : 'recipient:';

  const validate = async (values: ModalFormValues): Promise<ModalFormErrors> => {
    if (!assetMeta.script) throw new Error('exception: issued sudt should have script');
    const errors: ModalFormErrors = {};

    if (operationKind === 'invite') {
      if (!values.inviteRecipient) {
        errors.inviteRecipient = 'recipient required';
      } else {
        const error = await validateInviteAddress(values.inviteRecipient, assetMeta.script);
        if (error) errors.inviteRecipient = error;
      }
    }

    if (operationKind === 'issue') {
      if (!values.issueRecipient) {
        errors.issueRecipient = 'recipient required';
      } else if (values.issuePolicy === 'findAcp') {
        const recipientError = await validateIssueAcpAddress(values.issueRecipient, assetMeta.script);
        if (recipientError) errors.issueRecipient = recipientError;
      } else {
        const recipientError = await validateInviteAddress(values.issueRecipient, assetMeta.script);
        if (recipientError) errors.issueRecipient = recipientError;
      }
      if (!values.amount) {
        errors.amount = 'amount required';
      } else {
        const amountError = validateAmount(values.amount, assetMeta.decimal);
        if (amountError) errors.amount = amountError;
      }
    }

    return errors;
  };

  const formik = useFormik({
    initialValues,
    validate,
    onSubmit: (values: ModalFormValues) => {
      sendIssueTransaction({
        recipient: operationKind === 'issue' ? values.issueRecipient : values.inviteRecipient,
        amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toRawString(),
        operationKind: operationKind,
        policy: values.issuePolicy,
      }).then(() => setVisible(false));
    },
  });

  const onCancel = useCallback(() => {
    formik.resetForm();
    setVisible(false);
  }, [formik, setVisible]);

  return (
    <Modal title={title} closable width={312} visible={visible} onCancel={onCancel} footer={null}>
      {operationKind === 'invite' && (
        <div>
          <Row justify="center" align="middle">
            <Col span={4}>
              <label htmlFor="inviteRecipient">{recipientFieldDisplayName}</label>
            </Col>
            <Col span={16}>
              <Input id="inviteRecipient" placeholder="ckb address" {...formik.getFieldProps('inviteRecipient')} />
            </Col>
          </Row>
          <Row>
            <Col offset={6}>
              {formik.touched.inviteRecipient && formik.errors.inviteRecipient && (
                <Typography.Text type="danger">{formik.errors.inviteRecipient}</Typography.Text>
              )}
            </Col>
          </Row>
        </div>
      )}

      {operationKind === 'issue' && (
        <div>
          <div>
            <Row justify="center" align="middle">
              <Col span={7}>
                <label htmlFor="issuePolicy">policy:</label>
              </Col>
              <Col span={16}>
                <Select
                  style={{ width: '100%' }}
                  {...formik.getFieldProps('issuePolicy')}
                  onChange={(value) => formik.setFieldValue('issuePolicy', value)}
                >
                  <Select.Option key="findAcp" value="findAcp">
                    findAcp
                  </Select.Option>
                  <Select.Option key="createCell" value="createCell">
                    createCell
                  </Select.Option>
                </Select>
              </Col>
            </Row>
          </div>

          <div style={{ marginTop: '24px' }}>
            <Row justify="center" align="middle">
              <Col span={7}>
                <label htmlFor="issueRecipient">{recipientFieldDisplayName}</label>
              </Col>
              <Col span={16}>
                <Input id="issueRecipient" placeholder="ckb address" {...formik.getFieldProps('issueRecipient')} />
              </Col>
            </Row>
            <Row>
              <Col offset={8}>
                {formik.touched.issueRecipient && formik.errors.issueRecipient && (
                  <Typography.Text type="danger">{formik.errors.issueRecipient}</Typography.Text>
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
        </div>
      )}

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Button loading={isIssueLoading} onClick={formik.submitForm}>
          submit
        </Button>
      </div>
    </Modal>
  );
};
