// because of hot cell problem
// we need to ensure that different genesisSigner is used in different cases

import { utils } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { CkbAmount, Amount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  MintOptions,
  MintSudtBuilder,
  TransferCkbBuilder,
  TransferCkbOptions,
} from '../tx-builders';
import { randomHexString } from '../utils';
import { InternalNonAcpPwLockSigner } from '../wallets/PwWallet';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { TestProvider } from './TestProvider';

const testPrivateKeyIndex = 1;
jest.setTimeout(120000);

function eqAmount(a: string, b: string | number): void {
  expect(Amount.from(a).eq(b)).toBe(true);
}

// TODO remove skip when docker available in ci
test('test mint and transfer sudt with secp256k1', async () => {
  const provider = new TestProvider();
  await provider.init();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const issuerPrivateKey = provider.testPrivateKeys[testPrivateKeyIndex]!;

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

  eqAmount(beforeBalance0, 0);

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
      capacityPolicy: 'createCell',
    },

    // mint random udt
    {
      recipient: recipientAddr1,
      additionalCapacity: Math.ceil(Math.random() * 10 ** 8).toString(),
      amount: Math.ceil(Math.random() * 10 ** 8).toString(),
      capacityPolicy: 'createCell',
    },
  ];

  const unsigned = await new MintSudtBuilder({ recipients }, provider, await issuerSigner.getAddress()).build();
  const mintTxHash = await provider.rpc.send_transaction(await issuerSigner.seal(unsigned));
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(recipientAddr0, testUdt), 0);
  eqAmount(await provider.getUdtBalance(recipientAddr1, testUdt), recipients[1]!.amount);

  // recipient1 -> recipient0
  const signer = new Secp256k1Signer(recipientPrivKey1, provider, {
    code_hash: ANYONE_CAN_PAY.CODE_HASH,
    hash_type: ANYONE_CAN_PAY.HASH_TYPE,
  });
  const unsignedTransferTx = await new AcpTransferSudtBuilder(
    { recipients: [{ amount: '1', recipient: recipientAddr0, sudt: testUdt, policy: 'findOrCreate' }] },
    provider,
    await signer.getAddress(),
  ).build();

  const transferTxHash = await provider.sendTransaction(await signer.seal(unsignedTransferTx));
  const transferTx = await provider.waitForTransactionCommitted(transferTxHash);

  expect(transferTx != null).toBe(true);
  eqAmount(await provider.getUdtBalance(recipientAddr0, testUdt), 1);
});

test('test non-acp-pw lock mint and transfer', async () => {
  const provider = new TestProvider();
  await provider.init();

  const { debug } = provider;

  const genesisSigner = provider.getGenesisSigner(1);
  // TODO replace with pw signer when it is fixed
  // const pwSigner = new Secp256k1Signer(randomHexString(64), provider, provider.newScript('SECP256K1_BLAKE160'));
  const pwSigner = new InternalNonAcpPwLockSigner(randomHexString(64), provider);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();
  const recipient1Address = await recipient1Signer.getAddress();
  const recipient2Address = await recipient2Signer.getAddress();

  const transferCkbRecipients: TransferCkbOptions['recipients'] = Array(1000).fill({
    recipient: await pwSigner.getAddress(),
    amount: String(61n * 10n ** 8n),
    capacityPolicy: 'createCell',
  });
  debug(`start transfer %o`, { from: await genesisSigner.getAddress(), to: transferCkbRecipients });
  const unsignedTransferCkbTx = await new TransferCkbBuilder(
    { recipients: transferCkbRecipients },
    provider,
    await genesisSigner.getAddress(),
  ).build();
  const signed = await genesisSigner.seal(unsignedTransferCkbTx);
  const transferCkbTxHash = await provider.sendTxUntilCommitted(signed);
  debug(`end transfer ckb, %s`, transferCkbTxHash);

  debug('start mint');
  const sudtRecipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: recipient1Address,
      amount: '0',
      capacityPolicy: 'createCell',
      additionalCapacity: CkbAmount.fromCkb(1).toString(),
    },
    // mint 1000 unit udt with additional 5 ckb
    {
      recipient: recipient2Address,
      amount: '1000',
      capacityPolicy: 'createCell',
      additionalCapacity: CkbAmount.fromCkb(5).toString(),
    },
  ];
  debug('mint from %s, to %o', await pwSigner.getAddress(), sudtRecipients);

  const unsignedMintTx = await new MintSudtBuilder(
    { recipients: sudtRecipients },
    provider,
    await pwSigner.getAddress(),
  ).build();
  debug('ready to send unsignedMintTx: %o', unsignedMintTx);
  const mintTxHash = await provider.sendTxUntilCommitted(await pwSigner.seal(unsignedMintTx));
  debug('end mint %s', mintTxHash);

  const testUdt = provider.newSudtScript(await pwSigner.getAddress());

  debug('start transfer sudt %o', {
    from: recipient2Address,
    to: recipient1Address,
    amount: '1',
  });
  // recipient2 -> recipient1 with 1 udt
  const unsignedTransferUdtTx = await new AcpTransferSudtBuilder(
    { recipients: [{ amount: '1', recipient: recipient1Address, sudt: testUdt, policy: 'findOrCreate' }] },
    provider,
    recipient2Address,
  ).build();

  const transferSudtTxHash = await provider.sendTxUntilCommitted(await recipient2Signer.seal(unsignedTransferUdtTx));
  debug('end transfer sudt: %s', transferSudtTxHash);

  expect(transferSudtTxHash != null).toBe(true);
  eqAmount(await provider.getUdtBalance(recipient1Address, testUdt), 1);
  eqAmount(await provider.getUdtBalance(recipient2Address, testUdt), 999);

  const udtCells1 = await provider.collectUdtCells(recipient1Address, testUdt, '1');
  const additionalCapacity1 = Number(udtCells1[0]?.output?.capacity) - 142 * 10 ** 8;
  expect(CkbAmount.fromShannon(additionalCapacity1).eq(CkbAmount.fromCkb(1))).toBe(true);
});

test('mint sudt with a mix of policies', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = provider.getGenesisSigner(1);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();
  const recipient3Signer = provider.generateAcpSigner();
  const recipient1Address = await recipient1Signer.getAddress();
  const recipient2Address = await recipient2Signer.getAddress();
  const recipient3Address = await recipient3Signer.getAddress();

  const sudtType = provider.newSudtScript(await issuerSigner.getAddress());

  const issuerAddress = await issuerSigner.getAddress();

  const failedTx = new MintSudtBuilder(
    {
      recipients: [
        { recipient: recipient1Address, amount: '100', capacityPolicy: 'createCell' },
        { recipient: recipient2Address, amount: '100', capacityPolicy: 'findAcp' },
        { recipient: recipient3Address, amount: '100', capacityPolicy: 'findAcp' },
      ],
    },
    provider,
    issuerAddress,
  ).build();

  // cannot createCell for an address without acp cell
  await expect(failedTx).rejects.toBeTruthy();

  // issuer -> recipient1: 0
  //        -> recipient2: 100
  //        -> recipient3: 100 + 100 (2 cells)
  await provider.sendTxUntilCommitted(
    await issuerSigner.seal(
      await new MintSudtBuilder(
        {
          recipients: [
            { recipient: recipient1Address, amount: '0', capacityPolicy: 'createCell' },

            { recipient: recipient2Address, amount: '100', capacityPolicy: 'createCell' },

            // the sudt balance of recipient3 will be split into 2 cells
            { recipient: recipient3Address, amount: '100', capacityPolicy: 'createCell' },
            { recipient: recipient3Address, amount: '100', capacityPolicy: 'createCell' },
          ],
        },
        provider,
        issuerAddress,
      ).build(),
    ),
  );

  eqAmount(await provider.getUdtBalance(recipient1Address, sudtType), 0);
  eqAmount(await provider.getUdtBalance(recipient2Address, sudtType), 100);
  eqAmount(await provider.getUdtBalance(recipient3Address, sudtType), 200);

  // the sudt balance of recipient3 will be split into 2 cells
  expect(await provider.collectUdtCells(recipient3Address, sudtType, '101')).toHaveLength(2);

  // issuer -> recipient1: 100 (by findAcp)
  //        -> recipient2: 100 (by findAcp)
  //        -> recipient3: 100 (by findAcp)
  await provider.sendTxUntilCommitted(
    await issuerSigner.seal(
      await new MintSudtBuilder(
        {
          recipients: [
            { recipient: recipient1Address, amount: '100', capacityPolicy: 'findAcp' },

            // the sudt balance of recipient2 will be split into 2 cells
            { recipient: recipient2Address, amount: '100', capacityPolicy: 'createCell' },

            { recipient: recipient3Address, amount: '100', capacityPolicy: 'findAcp' },
          ],
        },
        provider,
        issuerAddress,
      ).build(),
    ),
  );

  eqAmount(await provider.getUdtBalance(recipient1Address, sudtType), 100);
  eqAmount(await provider.getUdtBalance(recipient2Address, sudtType), 200);

  // the sudt balance of recipient2 will be split into 2 cells
  expect(await provider.collectUdtCells(recipient3Address, sudtType, '101')).toHaveLength(2);
  eqAmount(await provider.getUdtBalance(recipient3Address, sudtType), 300);

  // recipient3 sudt
  //                  --merge-->  recipient3 sudt(142 x 2)   --transfer--> recipient1
  // recipient3 sudt
  await provider.sendTxUntilCommitted(
    await recipient3Signer.seal(
      await new AcpTransferSudtBuilder(
        { recipients: [{ recipient: recipient1Address, sudt: sudtType, amount: '300', policy: 'findOrCreate' }] },
        provider,
        recipient3Address,
      ).build(),
    ),
  );

  eqAmount(await provider.getUdtBalance(recipient1Address, sudtType), 400);
  eqAmount(await provider.getUdtBalance(recipient2Address, sudtType), 200);
  eqAmount(await provider.getUdtBalance(recipient3Address, sudtType), 0);

  const recipient3Cells = await provider.collectUdtCells(recipient3Address, sudtType, '0');
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

test('test serialize and deserialized', async () => {
  const provider = new TestProvider();

  await provider.init();

  const genesisSigner = provider.getGenesisSigner(1);
  const builder = new TransferCkbBuilder(
    {
      recipients: [
        {
          recipient: await provider.generateAcpSigner().getAddress(),
          amount: '6100000000',
          capacityPolicy: 'createCell',
        },
      ],
    },
    provider,
    await genesisSigner.getAddress(),
  );

  const unsigned = await builder.build();
  const serialized = builder.serialize(unsigned);
  const deserialized = TransferCkbBuilder.serde.deserialize(serialized);

  const txHash = await provider.sendTransaction(await genesisSigner.seal(deserialized));

  expect(txHash).toBeTruthy();
});

test('test find_acp_transfer_sudt with extra capacity supply', async () => {
  const provider = new TestProvider();
  await provider.init();
  const { debug } = provider;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const issuerPrivateKey = provider.testPrivateKeys[testPrivateKeyIndex]!;

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

  eqAmount(beforeBalance0, 0);

  const issuerSigner = new Secp256k1Signer(issuerPrivateKey, provider, {
    code_hash: SECP256K1_BLAKE160.CODE_HASH,
    hash_type: SECP256K1_BLAKE160.HASH_TYPE,
  });

  // transfer ckb to recipientAddr1
  debug(`start transfer %o`, { from: await issuerSigner.getAddress(), to: recipientAddr1 });
  const unsignedTransferCkbTx = await new TransferCkbBuilder(
    { recipients: [{ recipient: recipientAddr1, amount: '1000000000000', capacityPolicy: 'createCell' }] },
    provider,
    await issuerSigner.getAddress(),
  ).build();
  const signed = await issuerSigner.seal(unsignedTransferCkbTx);
  const transferCkbTxHash = await provider.sendTxUntilCommitted(signed);
  debug(`end transfer ckb, %s`, transferCkbTxHash);

  const recipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: recipientAddr0,
      additionalCapacity: '0',
      amount: '0',
      capacityPolicy: 'createCell',
    },

    // mint random udt
    {
      recipient: recipientAddr1,
      additionalCapacity: '0',
      amount: Math.ceil(Math.random() * 10 ** 8).toString(),
      capacityPolicy: 'createCell',
    },
  ];

  const unsigned = await new MintSudtBuilder({ recipients }, provider, await issuerSigner.getAddress()).build();
  const mintTxHash = await provider.rpc.send_transaction(await issuerSigner.seal(unsigned));
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(recipientAddr0, testUdt), 0);
  eqAmount(await provider.getUdtBalance(recipientAddr1, testUdt), recipients[1]!.amount);

  // recipient1 -> recipient0
  const signer = new Secp256k1Signer(recipientPrivKey1, provider, {
    code_hash: ANYONE_CAN_PAY.CODE_HASH,
    hash_type: ANYONE_CAN_PAY.HASH_TYPE,
  });
  const unsignedTransferTx = await new AcpTransferSudtBuilder(
    { recipients: [{ amount: '1', recipient: recipientAddr0, sudt: testUdt, policy: 'findAcp' }] },
    provider,
    await signer.getAddress(),
  ).build();

  const transferTxHash = await provider.sendTransaction(await signer.seal(unsignedTransferTx));
  const transferTx = await provider.waitForTransactionCommitted(transferTxHash);

  expect(transferTx != null).toBe(true);
  eqAmount(await provider.getUdtBalance(recipientAddr0, testUdt), 1);
});

// TODO impl testcase
test.skip('test duplicate options', async () => {
  return;
});
test.skip('test mixed policy options', async () => {
  return;
});
test.skip('other testcases', async () => {
  return;
});
