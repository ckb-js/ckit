import { utils } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { TestProvider } from '../__tests__/TestProvider';
import { CkbAmount } from '../helpers';
import { nonNullable, randomHexString } from '../utils';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { AcpTransferSudtBuilder } from './AcpTransferSudtBuilder';
import { MintOptions, MintSudtBuilder } from './MintSudtBuilder';
import { MintSudtBuilder2 } from './MintSudtBuilder2';
import { TransferCkbBuilder, TransferCkbOptions } from './internal/TransferCkbBuilder';
import { InternalNonAcpPwLockSigner } from '../wallets/NonAcpPwLockWallet';

// TODO remove skip when docker available in ci
test('test mint and transfer', async () => {
  jest.setTimeout(120000);
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

// remove skip when
test('test non-acp-pw lock mint and transfer', async () => {
  jest.setTimeout(120000);

  const provider = new TestProvider();
  await provider.init();

  const { debug } = provider;

  const privKey = nonNullable(provider.testPrivateKeys[1]);
  const genesisSigner = new Secp256k1Signer(privKey, provider, provider.newScript('SECP256K1_BLAKE160'));
  // TODO replace with pw signer when it is fixed
  // const pwSigner = new Secp256k1Signer(randomHexString(64), provider, provider.newScript('SECP256K1_BLAKE160'));
  const pwSigner = new InternalNonAcpPwLockSigner(randomHexString(64), provider);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();

  const transferCkbRecipients: TransferCkbOptions['recipients'] = [
    { recipient: await pwSigner.getAddress(), amount: String(1_000_000n * 10n ** 8n), capacityPolicy: 'createAcp' },
  ];
  debug(`start transfer %o`, { from: await genesisSigner.getAddress(), to: transferCkbRecipients });
  const signedTransferCkbTx = await new TransferCkbBuilder(
    { recipients: transferCkbRecipients },
    provider,
    genesisSigner,
  ).build();
  const transferCkbTxHash = await provider.sendTxUntilCommitted(signedTransferCkbTx);
  debug(`end transfer ckb, %s`, transferCkbTxHash);

  debug('start mint');
  const sudtRecipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: await recipient1Signer.getAddress(),
      amount: '0',
      capacityPolicy: 'createAcp',
      additionalCapacity: CkbAmount.fromCkb(1).toString(),
    },
    // mint 1000 unit udt with additional 5 ckb
    {
      recipient: await recipient2Signer.getAddress(),
      amount: '1000',
      capacityPolicy: 'createAcp',
      additionalCapacity: CkbAmount.fromCkb(5).toString(),
    },
  ];
  debug('mint from %s, to %o', await pwSigner.getAddress(), sudtRecipients);

  const signedMintTx = await new MintSudtBuilder2({ recipients: sudtRecipients }, provider, pwSigner).build();
  debug('ready to send signedMintTx: %o', signedMintTx);
  const mintTxHash = await provider.sendTxUntilCommitted(signedMintTx);
  debug('end mint %s', mintTxHash);

  const testUdt = provider.newSudtScript(await pwSigner.getAddress());

  debug('start transfer sudt %o', {
    from: await recipient2Signer.getAddress(),
    to: await recipient1Signer.getAddress(),
    amount: '1',
  });
  // recipient2 -> recipient1 with 1 udt
  const signedTransferUdtTx = await new AcpTransferSudtBuilder(
    { amount: '1', recipient: await recipient1Signer.getAddress(), sudt: testUdt },
    provider,
    recipient2Signer,
  ).build();

  const transferSudtTxHash = await provider.sendTxUntilCommitted(signedTransferUdtTx);
  debug('end transfer sudt: %s', transferSudtTxHash);

  expect(transferSudtTxHash != null).toBe(true);
  expect(await provider.getUdtBalance(await recipient1Signer.getAddress(), testUdt)).toBe('1');
  expect(await provider.getUdtBalance(await recipient2Signer.getAddress(), testUdt)).toBe('999');

  const udtCells1 = await provider.collectUdtCells(await recipient1Signer.getAddress(), testUdt, '1');
  const additionalCapacity1 = Number(udtCells1[0]?.output?.capacity) - 142 * 10 ** 8;
  expect(CkbAmount.fromShannon(additionalCapacity1).equals(CkbAmount.fromCkb(1))).toBe(true);
});
