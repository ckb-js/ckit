import { utils } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { TestProvider } from '../__tests__/TestProvider';
import { randomHexString } from '../utils';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { MintOptions, MintSudtBuilder } from './MintSudtBuilder';

// TODO remove skip when docker available in ci
test.skip('test mint and transfer', async () => {
  jest.setTimeout(60000);
  const provider = new TestProvider();
  await provider.init();

  const issuerPrivateKey = provider.assemberPrivateKey;

  const recipientPrivKey0 = randomHexString(64);
  const recipientPrivKey1 = randomHexString(64);

  const { SECP256K1_BLAKE160, ANYONE_CAN_PAY, SUDT } = provider.config.SCRIPTS;

  const recipientAddr0 = provider.parseToAddress({
    hash_type: ANYONE_CAN_PAY.HASH_TYPE,
    code_hash: ANYONE_CAN_PAY.CODE_HASH,
    args: Secp256k1Signer.privateKeyToBlake160(recipientPrivKey0),
  });

  const recipientAddr1 = provider.parseToAddress({
    hash_type: ANYONE_CAN_PAY.HASH_TYPE,
    code_hash: ANYONE_CAN_PAY.CODE_HASH,
    args: Secp256k1Signer.privateKeyToBlake160(recipientPrivKey1),
  });

  const issuerLockHash = utils.computeScriptHash({
    code_hash: SECP256K1_BLAKE160.CODE_HASH,
    hash_type: SECP256K1_BLAKE160.HASH_TYPE,
    args: key.privateKeyToBlake160(issuerPrivateKey),
  });

  const testUdt = {
    code_hash: SUDT.CODE_HASH,
    hash_type: SUDT.HASH_TYPE,
    args: issuerLockHash,
  };
  const beforeBalance0 = await provider.getUdtBalance(recipientAddr0, testUdt);

  expect(beforeBalance0).toBe('0');

  const issuerSigner = new Secp256k1Signer(issuerPrivateKey, provider, {
    code_hash: SECP256K1_BLAKE160.CODE_HASH,
    hash_type: SECP256K1_BLAKE160.HASH_TYPE,
  });

  const recipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: recipientAddr0,
      additionalCapacity: Math.ceil(Math.random() * 10 ** 8).toString(),
      amount: '0',
      capacityPolicy: 'createAcp',
    },

    // mint random udt
    {
      recipient: recipientAddr1,
      additionalCapacity: Math.ceil(Math.random() * 10 ** 8).toString(),
      amount: Math.ceil(Math.random() * 10 ** 8).toString(),
      capacityPolicy: 'createAcp',
    },
  ];

  const signedMintTx = await new MintSudtBuilder({ recipients }, provider, issuerSigner).build();
  const mintTxHash = await provider.rpc.send_transaction(signedMintTx);
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  expect(await provider.getUdtBalance(recipientAddr0, testUdt)).toBe('0');
  expect(await provider.getUdtBalance(recipientAddr1, testUdt)).toBe(recipients[1]?.amount);

  // TODO uncomment when transfer is available
  // recipient1 -> recipient0
  // const signedTransferTx = await new AcpTransferSudtBuilder(
  //   { amount: '1', recipient: recipientAddr0, sudt: testUdt },
  //   provider,
  //   new Secp256k1Signer(recipientPrivKey1, provider, {
  //     code_hash: ANYONE_CAN_PAY.CODE_HASH,
  //     hash_type: ANYONE_CAN_PAY.HASH_TYPE,
  //   }),
  // ).build();
  //
  // const transferTxHash = await provider.sendTransaction(signedTransferTx);
  // const transferTx = await provider.waitForTransactionCommitted(transferTxHash);
  //
  // expect(transferTx != null).toBe(true);
  // expect(await provider.getUdtBalance(recipientAddr0, testUdt)).toBe('1');
});
