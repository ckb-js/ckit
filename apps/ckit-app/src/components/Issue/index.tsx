import { Address, HexString } from '@ckb-lumos/base';
import { Button, Col, List, Modal, Row, Space, Typography } from 'antd';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { WalletContainer } from 'containers/WalletContainer';

type OperationKind = 'invite' | 'issue';

export const IssueOperation = observer(() => {
  const { wallets, setCurrentWalletIndex, setError } = WalletContainer.useContainer();

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
    <div>
      <Row>
        <Col span={4} offset={4}>
          <Button onClick={onClickInvite}>invite</Button>
        </Col>
        <Col span={4} offset={8}>
          <Button onClick={onClickIssue}>issue</Button>
        </Col>
      </Row>
      <ModalForm visible={visible} setVisible={setVisible} operationKind={operationKind} />
    </div>
  );
});

interface ModalFormProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  operationKind: OperationKind;
}

interface ModalFormValues {
  recipient: Address;
  amount: HexString;
}

interface ModalFormErrors {
  recipient?: Address;
  amount?: HexString;
}

export const ModalForm: React.FC<ModalFormProps> = (props) => {
  const { visible, setVisible, operationKind } = props;

  const initialValues: ModalFormValues = { recipient: '', amount: '' };
  const title = operationKind === 'invite' ? 'invite user' : 'issue udt';
  const recipientFieldDisplayName = operationKind === 'invite' ? 'user:' : 'recipient:';

  const validate = (values: ModalFormValues): ModalFormErrors => {
    return { recipient: 'error mkxbl', amount: 'eeror amount' };
  };

  return (
    <Modal title={title} closable width={312} visible={visible} onCancel={() => setVisible(false)} footer={null}>
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values: ModalFormValues, { setSubmitting }) => {
          setTimeout(() => {
            alert(JSON.stringify(values, null, 2));
            setSubmitting(false);
          }, 400);
        }}
      >
        <Form>
          <div>
            <Row>
              <Col span={6}>
                <label htmlFor="recipient">{recipientFieldDisplayName}</label>
              </Col>
              <Col span={16}>
                <Field name="recipient" type="text" placeholder="ckb address" />
              </Col>
            </Row>
            <ErrorMessage
              name="recipient"
              children={(errorMessage) => {
                return <Typography.Text type={'danger'}>{errorMessage}</Typography.Text>;
              }}
            />
          </div>

          {operationKind === 'issue' && (
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
                  return <Typography.Text type={'danger'}>{errorMessage}</Typography.Text>;
                }}
              />
            </div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button type="submit">Submit</button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
};
