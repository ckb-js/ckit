import { Address, HexNumber } from '@ckb-lumos/base';
import { Button, Col, Input, Modal, Row, Typography } from 'antd';
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
  amount: HexNumber;
}

interface ModalFormErrors {
  inviteRecipient?: string;
  issueRecipient?: string;
  amount?: string;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, operationKind, assetMeta } = props;

  const { validateInviteAddress, validateIssueAddress, validateAmount } = useFormValidate();
  const { mutateAsync: sendIssueTransaction, isLoading: isIssueLoading } = useSendIssueTx();

  const initialValues: ModalFormValues = { inviteRecipient: '', issueRecipient: '', amount: '' };
  const title = operationKind === 'invite' ? 'Invite user' : 'Issue ' + assetMeta.symbol;
  const recipientFieldDisplayName = operationKind === 'invite' ? 'user:' : 'recipient:';

  const validate = async (values: ModalFormValues): Promise<ModalFormErrors> => {
    if (!assetMeta.script) throw new Error('exception: issued sudt should have script');
    const errors: ModalFormErrors = {};
    if (operationKind === 'invite') {
      errors.inviteRecipient = await validateInviteAddress(values.inviteRecipient, assetMeta.script);
    }
    if (operationKind === 'issue') {
      errors.issueRecipient = await validateIssueAddress(values.issueRecipient, assetMeta.script);
      errors.amount = validateAmount(values.amount, assetMeta.decimal);
    }
    return errors;
  };

  const formik = useFormik({
    initialValues,
    validate,
    onSubmit: (values: ModalFormValues) => {
      sendIssueTransaction({
        recipient: values.inviteRecipient,
        amount: AssetAmount.fromHumanize(values.amount, assetMeta.decimal).toRawString(),
        operationKind: operationKind,
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
