// because of hot cell problem
// we need to ensure that different genesisSigner is used in different cases

import { utils } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { Amount, CkbAmount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  MintOptions,
  MintSudtBuilder,
  TransferCkbBuilder,
  TransferCkbOptions,
  ChequeDepositBuilder,
  ChequeClaimBuilder,
  ChequeWithdrawBuilder,
} from '../tx-builders';
import { randomHexString, asyncSleep, nonNullable } from '../utils';
import { InternalNonAcpPwLockSigner } from '../wallets/PwWallet';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { TestProvider } from './TestProvider';

const testPrivateKeyIndex = 1;
jest.setTimeout(60 * 1000 * 30);

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
  const mintTxHash = await provider.sendTransaction(await issuerSigner.seal(unsigned));
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(recipientAddr0, testUdt), 0);
  eqAmount(await provider.getUdtBalance(recipientAddr1, testUdt), nonNullable(recipients[1]).amount);

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

  const genesisSigner = provider.getGenesisSigner(testPrivateKeyIndex);
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

  const issuerSigner = provider.getGenesisSigner(testPrivateKeyIndex);
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

  const genesisSigner = provider.getGenesisSigner(testPrivateKeyIndex);
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

  const txHash = await provider.sendTxUntilCommitted(await genesisSigner.seal(deserialized));

  expect(txHash).toBeTruthy();
});

test('test find_acp_transfer_sudt with extra capacity supply', async () => {
  const provider = new TestProvider();
  await provider.init();
  const { debug } = provider;

  const issuerSigner = provider.getGenesisSigner(testPrivateKeyIndex);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();
  const recipient3Signer = provider.generateAcpSigner();
  const recipient1Address = recipient1Signer.getAddress();
  const recipient2Address = recipient2Signer.getAddress();
  const recipient3Address = recipient3Signer.getAddress();
  const testUdt = provider.newSudtScript(issuerSigner.getAddress());

  const beforeBalance0 = await provider.getUdtBalance(recipient1Address, testUdt);

  eqAmount(beforeBalance0, 0);

  // transfer ckb to recipient2Address
  debug(`start transfer %o`, { from: issuerSigner.getAddress(), to: recipient2Address });
  const unsignedTransferCkbTx = await new TransferCkbBuilder(
    { recipients: [{ recipient: recipient2Address, amount: '1000000000000', capacityPolicy: 'createCell' }] },
    provider,
    issuerSigner.getAddress(),
  ).build();
  const signed = await issuerSigner.seal(unsignedTransferCkbTx);
  const transferCkbTxHash = await provider.sendTxUntilCommitted(signed);
  debug(`end transfer ckb, %s`, transferCkbTxHash);

  const recipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: recipient1Address,
      additionalCapacity: '0',
      amount: '0',
      capacityPolicy: 'createCell',
    },

    // mint random udt
    {
      recipient: recipient2Address,
      additionalCapacity: '0',
      amount: Math.ceil(Math.random() * 10 ** 8).toString(),
      capacityPolicy: 'createCell',
    },
  ];

  const unsigned = await new MintSudtBuilder({ recipients }, provider, await issuerSigner.getAddress()).build();
  const mintTxHash = await provider.rpc.send_transaction(await issuerSigner.seal(unsigned), 'passthrough');
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(recipient1Address, testUdt), 0);
  eqAmount(await provider.getUdtBalance(recipient2Address, testUdt), nonNullable(recipients[1]).amount);

  const unsignedTransferTx = await new AcpTransferSudtBuilder(
    {
      recipients: [
        { amount: '1', recipient: recipient1Address, sudt: testUdt, policy: 'findAcp' },
        {
          amount: '1',
          recipient: recipient3Address,
          sudt: testUdt,
          policy: 'findOrCreate',
        },
      ],
    },
    provider,
    await recipient2Signer.getAddress(),
  ).build();

  const transferTxHash = await provider.sendTransaction(await recipient2Signer.seal(unsignedTransferTx));
  const transferTx = await provider.waitForTransactionCommitted(transferTxHash);

  expect(transferTx != null).toBe(true);
  eqAmount(await provider.getUdtBalance(recipient1Address, testUdt), 1);
  eqAmount(await provider.getUdtBalance(recipient3Address, testUdt), 1);
  const recipient2Balance = await provider.getCkbLiveCellsBalance(recipient2Address);
  expect(CkbAmount.fromShannon(recipient2Balance).gt(CkbAmount.fromCkb(10000 - 143 - 1))).toBe(true);
});

test('test create_cell_transfer_sudt without extra capacity supply', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = provider.getGenesisSigner(testPrivateKeyIndex);
  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();
  const recipient3Signer = provider.generateAcpSigner();
  const recipient1Address = await recipient1Signer.getAddress();
  const recipient2Address = await recipient2Signer.getAddress();
  const recipient3Address = await recipient3Signer.getAddress();
  const testUdt = provider.newSudtScript(await issuerSigner.getAddress());

  const beforeBalance0 = await provider.getUdtBalance(recipient1Address, testUdt);
  eqAmount(beforeBalance0, 0);

  const recipients: MintOptions['recipients'] = [
    // create acp cell
    {
      recipient: recipient1Address,
      additionalCapacity: '1000000000000',
      amount: '10000',
      capacityPolicy: 'createCell',
    },
    {
      recipient: recipient3Address,
      additionalCapacity: '1',
      amount: '0',
      capacityPolicy: 'createCell',
    },
  ];

  const unsigned = await new MintSudtBuilder({ recipients }, provider, await issuerSigner.getAddress()).build();
  const mintTxHash = await provider.sendTransaction(await issuerSigner.seal(unsigned));
  const mintTx = await provider.waitForTransactionCommitted(mintTxHash);

  expect(mintTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(recipient1Address, testUdt), nonNullable(recipients[0]).amount);
  eqAmount(await provider.getUdtBalance(recipient2Address, testUdt), 0);

  const unsignedTransferTx = await new AcpTransferSudtBuilder(
    {
      recipients: [
        { amount: '1', recipient: recipient2Address, sudt: testUdt, policy: 'findOrCreate' },
        {
          amount: '1',
          recipient: recipient3Address,
          sudt: testUdt,
          policy: 'findOrCreate',
        },
      ],
    },
    provider,
    await recipient1Signer.getAddress(),
  ).build();

  const transferTxHash = await provider.sendTransaction(await recipient1Signer.seal(unsignedTransferTx));
  const transferTx = await provider.waitForTransactionCommitted(transferTxHash);

  expect(transferTx != null).toBe(true);
  eqAmount(await provider.getUdtBalance(recipient2Address, testUdt), 1);
  eqAmount(await provider.getUdtBalance(recipient3Address, testUdt), 1);
  const recipient1SudtCells = await provider.collectUdtCells(recipient1Address, testUdt, '1');
  expect(recipient1SudtCells.length).toBe(1);
  expect(
    CkbAmount.fromShannon(nonNullable(recipient1SudtCells[0]).output.capacity).gt(CkbAmount.fromCkb(10142 - 143 - 1)),
  ).toBe(true);
});

test('transfer SUDT with additionalCapacity and create capacity', async () => {
  // genesis -> recipient1: 1000 UDT(1000 CKB)
  //         -> recipient2: 1000 UDT(0 CKB)
  //         -> recipient5: 1000 UDT(0 CKB)
  // -----------------------------------------------
  // recipient1 -> recipient2: 1 UDT(2 CKB)
  //            -> recipient3: 0 UDT(142 + 10CKB) | + 100 CKB(createCapacity)
  //            -> recipient4: 1 UDT(142 + 0CKB)
  //            -> recipient5: 0 UDT(0 + 2CKB)

  const provider = new TestProvider();
  await provider.init();

  const genesis = provider.getGenesisSigner(testPrivateKeyIndex);

  const recipient1 = provider.generateAcpSigner();
  const recipient2 = provider.generateAcpSigner();
  const recipient3 = provider.generateAcpSigner();
  const recipient4 = provider.generateAcpSigner();
  const recipient5 = provider.generateAcpSigner();

  const sudt = provider.newSudtScript(genesis.getAddress());

  const mintTxBuilder = new MintSudtBuilder(
    {
      recipients: [
        {
          recipient: recipient1.getAddress(),
          amount: '1000',
          additionalCapacity: CkbAmount.fromCkb(1_000).toHex(),
          capacityPolicy: 'createCell',
        },
        {
          recipient: recipient2.getAddress(),
          amount: '1000',
          additionalCapacity: '0',
          capacityPolicy: 'createCell',
        },
        {
          recipient: recipient5.getAddress(),
          amount: '1000',
          additionalCapacity: '0',
          capacityPolicy: 'createCell',
        },
      ],
    },
    provider,
    genesis.getAddress(),
  );

  await provider.signAndSendTxUntilCommitted(genesis, mintTxBuilder);

  let recipientCells1 = await provider.collectUdtCells(recipient1.getAddress(), sudt, '0x0');
  let recipientCells2 = await provider.collectUdtCells(recipient2.getAddress(), sudt, '0x0');

  expect(CkbAmount.fromShannon(recipientCells1[0]?.output.capacity ?? 0).eq(1_142_00000000n)).toBe(true);
  expect(CkbAmount.fromShannon(recipientCells2[0]?.output.capacity ?? 0).eq(142_00000000n)).toBe(true);

  const transferSudtBuilder = new AcpTransferSudtBuilder(
    {
      recipients: [
        {
          policy: 'findOrCreate',
          additionalCapacity: CkbAmount.fromCkb(2).toHex(),
          amount: '1',
          recipient: recipient2.getAddress(),
          sudt,
        },
        {
          policy: 'findOrCreate',
          additionalCapacity: CkbAmount.fromCkb(10).toHex(),
          amount: '0',
          recipient: recipient3.getAddress(),
          sudt,
          createCapacity: CkbAmount.fromCkb(100).toHex(),
        },
        {
          policy: 'findOrCreate',
          additionalCapacity: CkbAmount.fromCkb(0).toHex(),
          amount: '1',
          recipient: recipient4.getAddress(),
          sudt,
        },
        {
          policy: 'findOrCreate',
          additionalCapacity: CkbAmount.fromCkb(2).toHex(),
          amount: '0',
          recipient: recipient5.getAddress(),
          sudt,
        },
      ],
    },
    provider,
    recipient1.getAddress(),
  );

  await provider.signAndSendTxUntilCommitted(recipient1, transferSudtBuilder);

  recipientCells1 = await provider.collectUdtCells(recipient1.getAddress(), sudt, '0x0');
  recipientCells2 = await provider.collectUdtCells(recipient2.getAddress(), sudt, '0x0');

  const recipientCells3 = await provider.collectUdtCells(recipient3.getAddress(), sudt, '0x0');
  const recipientCells4 = await provider.collectUdtCells(recipient4.getAddress(), sudt, '0x0');
  const recipientCells5 = await provider.collectUdtCells(recipient5.getAddress(), sudt, '0x0');

  expect(recipientCells1).toHaveLength(1);
  expect(recipientCells2).toHaveLength(1);

  const createdRecipientCells3 = await provider.collectCkbLiveCells(recipient3.getAddress(), '0x0');
  expect(createdRecipientCells3).toHaveLength(1);

  // 1142 - (0 + 2) - (142 + 10 + 100) - (142 + 0) - (0 + 2)
  // recp1 - recp2  -       recp3      -  recp4    -  recp5
  expect(CkbAmount.fromShannon(recipientCells1[0]?.output.capacity ?? 0).gte(743_99900000n)).toBe(true);
  expect(CkbAmount.fromShannon(recipientCells2[0]?.output.capacity ?? 0).eq(144_00000000n)).toBe(true);
  expect(CkbAmount.fromShannon(recipientCells3[0]?.output.capacity ?? 0).eq(152_00000000n)).toBe(true);
  expect(CkbAmount.fromShannon(createdRecipientCells3[0]?.output.capacity ?? 0).eq(100_00000000n)).toBe(true);
  expect(CkbAmount.fromShannon(recipientCells4[0]?.output.capacity ?? 0).eq(142_00000000n)).toBe(true);
  expect(CkbAmount.fromShannon(recipientCells5[0]?.output.capacity ?? 0).eq(144_00000000n)).toBe(true);

  expect(Number(await provider.getUdtBalance(recipient1.getAddress(), sudt))).toBe(998);
  expect(Number(await provider.getUdtBalance(recipient2.getAddress(), sudt))).toBe(1001);
  expect(Number(await provider.getUdtBalance(recipient3.getAddress(), sudt))).toBe(0);
  expect(Number(await provider.getUdtBalance(recipient4.getAddress(), sudt))).toBe(1);
  expect(Number(await provider.getUdtBalance(recipient5.getAddress(), sudt))).toBe(1000);
});

test('transfer CKB and sudt at same time', async () => {
  const provider = new TestProvider();
  await provider.init();

  const recipient1 = provider.generateAcpSigner();
  const recipient2 = provider.generateAcpSigner();

  const { sudt } = await provider.mintSudtFromGenesis(
    {
      recipients: [
        {
          recipient: recipient1.getAddress(),
          amount: '1000',
          additionalCapacity: CkbAmount.fromCkb(10000).toHex(),
          capacityPolicy: 'createCell',
        },
        {
          recipient: recipient2.getAddress(),
          amount: '100',
          capacityPolicy: 'createCell',
        },
      ],
    },
    { testPrivateKeysIndex: testPrivateKeyIndex },
  );

  expect(await provider.collectUdtCells(recipient1.getAddress(), sudt, '0')).toHaveLength(1);
  expect(await provider.collectUdtCells(recipient2.getAddress(), sudt, '0')).toHaveLength(1);

  await provider.signAndSendTxUntilCommitted(
    recipient1,
    new AcpTransferSudtBuilder(
      {
        recipients: [
          {
            recipient: recipient2.getAddress(),
            amount: '1',
            createCapacity: CkbAmount.fromCkb(143).toHex(),
            policy: 'findAcp',
            sudt,
          },
        ],
      },
      provider,
      recipient1.getAddress(),
    ),
  );
});

test('transfer CKB with split cell and sudt with acp', async () => {
  const provider = new TestProvider();
  await provider.init();

  const genesis = provider.getGenesisSigner(testPrivateKeyIndex);
  const recipient1 = provider.generateAcpSigner();
  const recipient2 = provider.generateAcpSigner();

  const { sudt } = await provider.mintSudtFromGenesis(
    {
      recipients: [
        {
          recipient: recipient1.getAddress(),
          amount: '1000',
          additionalCapacity: CkbAmount.fromCkb(10000).toHex(),
          capacityPolicy: 'createCell',
        },
        {
          recipient: recipient2.getAddress(),
          amount: '100',
          capacityPolicy: 'createCell',
        },
      ],
    },
    { testPrivateKeysIndex: testPrivateKeyIndex },
  );

  expect(await provider.collectUdtCells(recipient1.getAddress(), sudt, '0')).toHaveLength(1);
  expect(await provider.collectUdtCells(recipient2.getAddress(), sudt, '0')).toHaveLength(1);

  await provider.signAndSendTxUntilCommitted(
    recipient1,
    new AcpTransferSudtBuilder(
      {
        recipients: [
          {
            recipient: genesis.getAddress(),
            amount: '1',
            policy: 'createCell',
            sudt,
          },
        ],
      },
      provider,
      recipient1.getAddress(),
    ),
  );

  await provider.signAndSendTxUntilCommitted(
    genesis,
    new AcpTransferSudtBuilder(
      {
        recipients: [
          {
            recipient: recipient2.getAddress(),
            sudt,
            createCapacity: CkbAmount.fromCkb(1000).toHex(),
            amount: '1',
            policy: 'findAcp',
          },
        ],
      },
      provider,
      genesis.getAddress(),
    ),
  );
});

test('deposit sudt cheque and claim it', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuer = provider.getGenesisSigner(testPrivateKeyIndex);
  const sender = provider.generateAcpSigner('SECP256K1_BLAKE160');
  const receiver = provider.generateAcpSigner('SECP256K1_BLAKE160');

  const sudt = provider.newSudtScript(issuer.getAddress());

  const mintTxBuilder = new MintSudtBuilder(
    {
      recipients: [
        { amount: '1000', recipient: sender.getAddress(), additionalCapacity: '0', capacityPolicy: 'createCell' },
      ],
    },
    provider,
    issuer.getAddress(),
  );
  await provider.signAndSendTxUntilCommitted(issuer, mintTxBuilder);

  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 1000);

  const ckbTransferBuilder = new TransferCkbBuilder(
    {
      recipients: [
        {
          recipient: sender.getAddress(),
          amount: '1000000000000',
          capacityPolicy: 'createCell',
        },
        {
          recipient: receiver.getAddress(),
          amount: '1000000000000',
          capacityPolicy: 'createCell',
        },
      ],
    },
    provider,
    await issuer.getAddress(),
  );
  await provider.signAndSendTxUntilCommitted(issuer, ckbTransferBuilder);

  const chequeDepositBuilder = new ChequeDepositBuilder(
    {
      receiver: receiver.getAddress(),
      sender: sender.getAddress(),
      amount: '500',
      sudt: sudt,
      skipCheck: true,
    },
    provider,
  );
  const unsignedDepositTx = await sender.seal(await chequeDepositBuilder.build());
  const depositTxHash = await provider.sendTransaction(unsignedDepositTx);
  const depositTx = await provider.waitForTransactionCommitted(depositTxHash);
  expect(depositTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 500);

  const chequeClaimBuilder = new ChequeClaimBuilder(
    {
      receiver: receiver.getAddress(),
      sender: sender.getAddress(),
      sudt: sudt,
    },
    provider,
  );
  const unsignedClaimTx = await receiver.seal(await chequeClaimBuilder.build());
  const claimTxHash = await provider.sendTransaction(unsignedClaimTx);
  const claimTx = await provider.waitForTransactionCommitted(claimTxHash);
  expect(claimTx != null).toBe(true);

  eqAmount(await provider.getUdtBalance(receiver.getAddress(), sudt), 500);
});

/**
 * Using Tippy to test this case.
 * Before testing, modify the value in the [miner.workers] section of the ckb-miner.toml file
 * in $HOME/.config/Tippy/chain-number/ to 1 to improve the mining speed
 */
test.skip('test withdraw cheque', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuer = provider.getGenesisSigner(testPrivateKeyIndex);
  const sender = provider.generateAcpSigner('SECP256K1_BLAKE160');
  const receiver = provider.generateAcpSigner('SECP256K1_BLAKE160');

  const sudt = provider.newSudtScript(issuer.getAddress());

  const mintTxBuilder = new MintSudtBuilder(
    {
      recipients: [
        { amount: '1000', recipient: sender.getAddress(), additionalCapacity: '0', capacityPolicy: 'createCell' },
      ],
    },
    provider,
    issuer.getAddress(),
  );
  await provider.signAndSendTxUntilCommitted(issuer, mintTxBuilder);

  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 1000);

  const ckbTransferBuilder = new TransferCkbBuilder(
    {
      recipients: [
        {
          recipient: sender.getAddress(),
          amount: '1000000000000',
          capacityPolicy: 'createCell',
        },
        {
          recipient: receiver.getAddress(),
          amount: '1000000000000',
          capacityPolicy: 'createCell',
        },
      ],
    },
    provider,
    await issuer.getAddress(),
  );
  await provider.signAndSendTxUntilCommitted(issuer, ckbTransferBuilder);

  const chequeDepositBuilder1 = new ChequeDepositBuilder(
    {
      receiver: receiver.getAddress(),
      sender: sender.getAddress(),
      amount: '500',
      sudt: sudt,
      skipCheck: true,
    },
    provider,
  );
  const unsignedDepositTx1 = await sender.seal(await chequeDepositBuilder1.build());
  const depositTxHash1 = await provider.sendTransaction(unsignedDepositTx1);
  const depositTx1 = await provider.waitForTransactionCommitted(depositTxHash1);
  expect(depositTx1 != null).toBe(true);
  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 500);

  const chequeDepositBuilder2 = new ChequeDepositBuilder(
    {
      receiver: receiver.getAddress(),
      sender: sender.getAddress(),
      amount: '200',
      sudt: sudt,
      skipCheck: true,
    },
    provider,
  );
  const unsignedDepositTx2 = await sender.seal(await chequeDepositBuilder2.build());
  const depositTxHash2 = await provider.sendTransaction(unsignedDepositTx2);
  const depositTx2 = await provider.waitForTransactionCommitted(depositTxHash2);
  expect(depositTx2 != null).toBe(true);
  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 300);

  // wait for 6 epoch to withdraw cheque cells
  const start = Date.now();
  const depositEpoch = Number((await provider.rpc.get_current_epoch()).number);
  const pollIntervalMs = 1000,
    timeoutMs = 120000;
  while (Date.now() - start <= timeoutMs) {
    const epoch = Number((await provider.rpc.get_current_epoch()).number);
    if (epoch - depositEpoch > 6) {
      break;
    }
    await asyncSleep(pollIntervalMs);
  }

  const chequeWithdrawBuilder = new ChequeWithdrawBuilder(
    {
      receiver: receiver.getAddress(),
      sender: sender.getAddress(),
      sudt: sudt,
    },
    provider,
  );
  const unsignedWithdrawTx = await sender.seal(await chequeWithdrawBuilder.build());
  const withdrawTxHash = await provider.sendTransaction(unsignedWithdrawTx);
  const withdrawTx = await provider.waitForTransactionCommitted(withdrawTxHash);
  expect(withdrawTx != null).toBe(true);
  eqAmount(await provider.getUdtBalance(sender.getAddress(), sudt), 1000);
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
