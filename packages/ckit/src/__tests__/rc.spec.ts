import { CkbAmount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  CreateRcUdtInfoCellBuilder,
  MintRcUdtBuilder,
  RcSupplyLockHelper,
  TransferCkbBuilder,
} from '../tx-builders';
import { nonNullable, randomHexString } from '../utils';
import { RC_MODE, RcEthSigner, RcSecp256k1Signer, RCLockSigner } from '../wallets/RcInternalSigner';
import { TestProvider } from './TestProvider';

const testPrivateKeysIndex = 0;
jest.setTimeout(60 * 1000 * 30);

// TODO remove skip when rc-lock related modules are implemented
test('test rc signer', async () => {
  const provider = new TestProvider();
  await provider.init();

  const rcSigner = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc: 100M ckb
  await provider.transferCkbFromGenesis(await rcSigner.getAddress(), CkbAmount.fromCkb(1000000).toHex(), {
    testPrivateKeysIndex,
  });

  const recipient = provider.generateAcpSigner();

  await provider.sendTxUntilCommitted(
    await rcSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [
            {
              recipient: await recipient.getAddress(),
              capacityPolicy: 'createCell',
              amount: CkbAmount.fromCkb(100).toHex(),
            },
          ],
        },
        provider,
        await rcSigner.getAddress(),
      ).build(),
    ),
  );

  const received = await provider.getCkbLiveCellsBalance(await recipient.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(100))).toBe(true);
});

test('should upgraded rc lock pass', async () => {
  const provider = new TestProvider();
  await provider.init();
  const upgradeDeployment = await provider.upgradeScript('rc_lock_new', 'RC_LOCK');
  await provider.waitForTransactionCommitted(upgradeDeployment.TX_HASH);

  const rcSigner = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc: 100M ckb
  await provider.transferCkbFromGenesis(await rcSigner.getAddress(), CkbAmount.fromCkb(1000000).toHex(), {
    testPrivateKeysIndex,
  });

  const recipient = provider.generateAcpSigner();

  const tx = await rcSigner.seal(
    await new TransferCkbBuilder(
      {
        recipients: [
          {
            recipient: await recipient.getAddress(),
            capacityPolicy: 'createCell',
            amount: CkbAmount.fromCkb(100).toHex(),
          },
        ],
      },
      provider,
      await rcSigner.getAddress(),
    ).build(),
  );

  const cellDeps = tx.cell_deps;
  const oldRcLockOutPointFound = cellDeps.findIndex((cellDep) => {
    cellDep.out_point.tx_hash === provider.config.SCRIPTS.RC_LOCK.TX_HASH &&
      cellDep.out_point.index === provider.config.SCRIPTS.RC_LOCK.INDEX;
  });
  // new rc lock is deployed, so the dead script should be absent in cell deps
  expect(oldRcLockOutPointFound).toBe(-1);

  await provider.sendTxUntilCommitted(tx);

  const received = await provider.getCkbLiveCellsBalance(await recipient.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(100))).toBe(true);
});

// TODO remove skip when rc-lock related modules are implemented
test('test rc udt lock', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = new RcSecp256k1Signer(randomHexString(64), provider);

  // genesis -> rc: 100M ckb
  await provider.transferCkbFromGenesis(issuerSigner.getAddress(), CkbAmount.fromCkb(1_000_000).toHex(), {
    testPrivateKeysIndex,
  });

  // create a rc udt info cell
  const createRcUdtInfoTxBuilder = new CreateRcUdtInfoCellBuilder(
    {
      rcIdentity: issuerSigner.getRcIdentity(),
      sudtInfo: {
        name: 'Test Token',
        symbol: 'TT',
        decimals: 8,
        description: 'it is a test token',
        maxSupply: '1000000',
      },
    },
    provider,
  );
  const createRcUdtInfoTx = await createRcUdtInfoTxBuilder.build();
  await provider.sendTxUntilCommitted(await issuerSigner.seal(createRcUdtInfoTx));

  const helper = new RcSupplyLockHelper(provider.mercury, {
    sudtType: provider.newScriptTemplate('SUDT'),
    rcLock: provider.newScriptTemplate('RC_LOCK'),
  });

  const sudts = await helper.listCreatedSudt({ rcIdentity: issuerSigner.getRcIdentity() });

  const udtInfo = nonNullable(sudts[0]);

  const recipient1Signer = provider.generateAcpSigner();
  const recipient2Signer = provider.generateAcpSigner();

  // issuer -> recipient1: 100 udt
  const signedMintTx = await issuerSigner.seal(
    await new MintRcUdtBuilder(
      {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        udtId: udtInfo.udtId,
        rcIdentity: issuerSigner.getRcIdentity(),
        recipients: [
          {
            recipient: await recipient1Signer.getAddress(),
            // 1ckb additional capacity for tx fee
            additionalCapacity: CkbAmount.fromCkb(1).toHex(),
            capacityPolicy: 'createCell',
            amount: '50',
          },
          {
            recipient: await recipient2Signer.getAddress(),
            // 1ckb additional capacity for tx fee
            additionalCapacity: CkbAmount.fromCkb(1).toHex(),
            capacityPolicy: 'createCell',
            amount: '0',
          },
        ],
      },
      provider,
    ).build(),
  );

  await provider.sendTxUntilCommitted(signedMintTx);

  const testUdt = helper.newSudtScript(udtInfo);
  const recipient1UdtBalance1 = await provider.getUdtBalance(await recipient1Signer.getAddress(), testUdt);

  expect(Number(recipient1UdtBalance1) === 50).toBe(true);

  await provider.sendTxUntilCommitted(
    await issuerSigner.seal(
      await new MintRcUdtBuilder(
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          udtId: udtInfo.udtId,
          rcIdentity: issuerSigner.getRcIdentity(),
          recipients: [
            {
              recipient: await recipient1Signer.getAddress(),
              // 1ckb additional capacity for tx fee
              additionalCapacity: CkbAmount.fromCkb(1).toHex(),
              capacityPolicy: 'findOrCreate',
              amount: '50',
            },
          ],
        },
        provider,
      ).build(),
    ),
  );

  const collectedCells = await provider.collectUdtCells(await recipient1Signer.getAddress(), testUdt, '100');
  expect(collectedCells.length).toBe(1);

  // recipient 1 -> recipient 2: 10 udt
  await provider.sendTxUntilCommitted(
    await recipient1Signer.seal(
      await new AcpTransferSudtBuilder(
        {
          recipients: [
            { recipient: await recipient2Signer.getAddress(), sudt: testUdt, amount: '10', policy: 'findOrCreate' },
          ],
        },
        provider,
        await recipient1Signer.getAddress(),
      ).build(),
    ),
  );

  const recipient1UdtBalance2 = await provider.getUdtBalance(await recipient1Signer.getAddress(), testUdt);
  expect(Number(recipient1UdtBalance2) === 90).toBe(true);
  const recipient2UdtBalance2 = await provider.getUdtBalance(await recipient2Signer.getAddress(), testUdt);
  expect(Number(recipient2UdtBalance2) === 10).toBe(true);
});

test('test rc with acp', async () => {
  // genesis -> rcSigner1(acp): 67 ckb
  //         -> rcSigner2(acp): 65 ckb
  // rcSigner1 -> rcSigner2: 1 ckb
  // expect(rcSigner1Balance < 67 ckb).toBe(true)
  // expect(rcSigner1Balance > 66.9 ckb).toBe(true)
  // expect(rcSigner2Balance  === 66 ckb).toBe(true)

  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(testPrivateKeysIndex);
  const rcSigner1 = new RCLockSigner(randomHexString(64), provider);
  const rcSigner2 = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc-lock
  const sender = await rcSigner1.getAddressByMode(RC_MODE.ACP);
  const recipient = await rcSigner2.getAddressByMode(RC_MODE.ACP);

  await provider.sendTxUntilCommitted(
    await genesisSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [
            {
              recipient: sender,
              amount: '6700000000', //  67 CKB
              capacityPolicy: 'createCell',
            },
            {
              recipient: recipient,
              amount: '6500000000', //  65 CKB
              capacityPolicy: 'createCell',
            },
          ],
        },
        provider,
        await genesisSigner.getAddress(),
      ).build(),
    ),
  );

  // rcSigner1 -> rcSigner2: 1 ckb
  const signed = await rcSigner1.seal(
    await new TransferCkbBuilder(
      {
        recipients: [
          {
            recipient: recipient,
            amount: '100000000',
            capacityPolicy: 'findAcp',
          },
        ],
      },
      provider,
      sender,
    ).build(),
  );
  await provider.sendTxUntilCommitted(signed);
  const recipientBalance = await provider.getCkbLiveCellsBalance(recipient);
  expect(CkbAmount.fromShannon(recipientBalance).eq(CkbAmount.fromCkb(66))).toBe(true);
});

test('test eth rc signer', async () => {
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(testPrivateKeysIndex);
  const rcSigner = new RcEthSigner(randomHexString(64), provider);
  await provider.sendTxUntilCommitted(
    await genesisSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [
            {
              recipient: await rcSigner.getAddress(),
              amount: '15000000000', //  100 CKB
              capacityPolicy: 'createCell',
            },
          ],
        },
        provider,
        await genesisSigner.getAddress(),
      ).build(),
    ),
  );

  // rc-lock -> ramdom-acp
  const recipient = provider.generateAcpSigner();

  await provider.sendTxUntilCommitted(
    await rcSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [{ recipient: await recipient.getAddress(), amount: '6100000000', capacityPolicy: 'createCell' }],
        },
        provider,
        await rcSigner.getAddress(),
      ).build(),
    ),
  );
  const received = await provider.getCkbLiveCellsBalance(await recipient.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(61))).toBe(true);
});
