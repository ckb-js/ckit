// because of hot cell problem
// we need to ensure that different genesisSigner is used in different cases

import { utils } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { TestProvider } from '../__tests__/TestProvider';
import { CkbAmount } from '../helpers';
import { randomHexString } from '../utils';
import { InternalNonAcpPwLockSigner } from '../wallets/NonAcpPwLockWallet';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { AcpTransferSudtBuilder } from './AcpTransferSudtBuilder';
import { MintOptions, MintSudtBuilder } from './MintSudtBuilder';
import { TransferCkbBuilder, TransferCkbOptions } from './TransferCkbBuilder';

// TODO remove skip when docker available in ci
test('test mint and transfer sudt with secp256k1', async () => {
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
  const signedTransferTx = await new AcpTransferSudtBuilder(
    { amount: '1', recipient: recipientAddr0, sudt: testUdt },
    provider,
    new Secp256k1Signer(recipientPrivKey1, provider, {
      code_hash: ANYONE_CAN_PAY.CODE_HASH,
      hash_type: ANYONE_CAN_PAY.HASH_TYPE,
    }),
  ).build();

  const transferTxHash = await provider.sendTransaction(signedTransferTx);
  const transferTx = await provider.waitForTransactionCommitted(transferTxHash);

  expect(transferTx != null).toBe(true);
  expect(await provider.getUdtBalance(recipientAddr0, testUdt)).toBe('1');
});

test('test non-acp-pw lock mint and transfer', async () => {
  jest.setTimeout(120000);

  const provider = new TestProvider();
  await provider.init();

  const { debug } = provider;

  const genesisSigner = provider.getGenesisSigner(1);
  // TODO replace with pw signer when it is fixed
  // const pwSigner = new Secp256k1Signer(randomHexString(64), provider, provider.newScript('SECP256K1_BLAKE160'));
  const pwSigner = new InternalNonAcpPwLockSigner(randomHexString(64), provider);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();

  const transferCkbRecipients: TransferCkbOptions['recipients'] = Array(1000).fill({
    recipient: await pwSigner.getAddress(),
    amount: String(61n * 10n ** 8n),
    capacityPolicy: 'createAcp',
  });
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

  const signedMintTx = await new MintSudtBuilder({ recipients: sudtRecipients }, provider, pwSigner).build();
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

test('mint sudt with a mix of policies', async () => {
  jest.setTimeout(120000);

  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = provider.getGenesisSigner(1);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();
  const recipient3Signer = provider.generateAcpSigner();

  const sudtType = provider.newSudtScript(await issuerSigner.getAddress());

  const failedTx = new MintSudtBuilder(
    {
      recipients: [
        { recipient: await recipient1Signer.getAddress(), amount: '100', capacityPolicy: 'createAcp' },
        { recipient: await recipient2Signer.getAddress(), amount: '100', capacityPolicy: 'findAcp' },
        { recipient: await recipient3Signer.getAddress(), amount: '100', capacityPolicy: 'findAcp' },
      ],
    },
    provider,
    issuerSigner,
  ).build();

  // cannot createAcp for an address without acp cell
  await expect(failedTx).rejects.toBeTruthy();

  // issuer -> recipient1: 0
  //        -> recipient2: 100
  //        -> recipient3: 100 + 100 (2 cells)
  await provider.sendTxUntilCommitted(
    await new MintSudtBuilder(
      {
        recipients: [
          { recipient: await recipient1Signer.getAddress(), amount: '0', capacityPolicy: 'createAcp' },

          { recipient: await recipient2Signer.getAddress(), amount: '100', capacityPolicy: 'createAcp' },

          // the sudt balance of recipient3 will be split into 2 cells
          { recipient: await recipient3Signer.getAddress(), amount: '100', capacityPolicy: 'createAcp' },
          { recipient: await recipient3Signer.getAddress(), amount: '100', capacityPolicy: 'createAcp' },
        ],
      },
      provider,
      issuerSigner,
    ).build(),
  );
  expect(await provider.getUdtBalance(await recipient1Signer.getAddress(), sudtType)).toBe('0');
  expect(await provider.getUdtBalance(await recipient2Signer.getAddress(), sudtType)).toBe('100');
  expect(await provider.getUdtBalance(await recipient3Signer.getAddress(), sudtType)).toBe('200');

  // the sudt balance of recipient3 will be split into 2 cells
  expect(await provider.collectUdtCells(await recipient3Signer.getAddress(), sudtType, '101')).toHaveLength(2);

  // issuer -> recipient1: 100 (by findAcp)
  //        -> recipient2: 100 (by findAcp)
  //        -> recipient3: 100 (by findAcp)
  await provider.sendTxUntilCommitted(
    await new MintSudtBuilder(
      {
        recipients: [
          { recipient: await recipient1Signer.getAddress(), amount: '100', capacityPolicy: 'findAcp' },

          // the sudt balance of recipient2 will be split into 2 cells
          { recipient: await recipient2Signer.getAddress(), amount: '100', capacityPolicy: 'createAcp' },

          { recipient: await recipient3Signer.getAddress(), amount: '100', capacityPolicy: 'findAcp' },
        ],
      },
      provider,
      issuerSigner,
    ).build(),
  );

  expect(await provider.getUdtBalance(await recipient1Signer.getAddress(), sudtType)).toBe('100');
  expect(await provider.getUdtBalance(await recipient2Signer.getAddress(), sudtType)).toBe('200');
  // the sudt balance of recipient2 will be split into 2 cells
  expect(await provider.collectUdtCells(await recipient2Signer.getAddress(), sudtType, '101')).toHaveLength(2);
  expect(await provider.getUdtBalance(await recipient3Signer.getAddress(), sudtType)).toBe('300');

  // recipient3 sudt
  //                  --merge-->  recipient3 sudt(142 x 2)   --transfer--> recipient1
  // recipient3 sudt
  await provider.sendTxUntilCommitted(
    await new AcpTransferSudtBuilder(
      { recipient: await recipient1Signer.getAddress(), sudt: sudtType, amount: '300' },
      provider,
      recipient3Signer,
    ).build(),
  );

  expect(await provider.getUdtBalance(await recipient1Signer.getAddress(), sudtType)).toBe('400');
  expect(await provider.getUdtBalance(await recipient2Signer.getAddress(), sudtType)).toBe('200');
  expect(await provider.getUdtBalance(await recipient3Signer.getAddress(), sudtType)).toBe('0');

  const recipient3Cells = await provider.collectUdtCells(await recipient3Signer.getAddress(), sudtType, '0');
  expect(recipient3Cells).toHaveLength(1);
  // capacity after sent
  const twoSudtCellsCapacity = 142n * 2n * 10n ** 8n;
  const recipient3CellsCapacity = BigInt(recipient3Cells[0]?.output?.capacity || 0);
  // 142 * 2 - 1 < recipient3_capacity < 142 * 2
  expect(
    twoSudtCellsCapacity - recipient3CellsCapacity < 1n * 10n ** 6n &&
      twoSudtCellsCapacity - recipient3CellsCapacity > 0,
  ).toBe(true);
});
