import { CkbAmount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  CreateRcUdtInfoCellBuilder,
  MintRcUdtBuilder,
  RcSupplyLockHelper,
  TransferCkbBuilder,
} from '../tx-builders';
import { nonNullable, randomHexString } from '../utils';
import { RC_MODE, RCEthSigner, RcInternalSigner, RCLockSigner } from '../wallets/RcInternalSigner';
import { TestProvider } from './TestProvider';

const testPrivateKeysIndex = 0;
jest.setTimeout(120000);

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
              capacityPolicy: 'createAcp',
              amount: CkbAmount.fromCkb(100).toHex(),
            },
          ],
        },
        provider,
        rcSigner,
      ).build(),
    ),
  );

  const received = await provider.getCkbLiveCellsBalance(await recipient.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(100))).toBe(true);
});

// TODO remove skip when rc-lock related modules are implemented
test('test rc udt lock', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = new RcInternalSigner(randomHexString(64), provider);

  // genesis -> rc: 100M ckb
  await provider.transferCkbFromGenesis(await issuerSigner.getAddress(), CkbAmount.fromCkb(1_000_000).toHex(), {
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
            capacityPolicy: 'createAcp',
            amount: '100',
          },
          {
            recipient: await recipient2Signer.getAddress(),
            // 1ckb additional capacity for tx fee
            additionalCapacity: CkbAmount.fromCkb(1).toHex(),
            capacityPolicy: 'createAcp',
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

  expect(Number(recipient1UdtBalance1) === 100).toBe(true);

  // recipient 1 -> recipient 2: 10 udt
  await provider.sendTxUntilCommitted(
    await recipient1Signer.seal(
      await new AcpTransferSudtBuilder(
        { recipient: await recipient2Signer.getAddress(), sudt: testUdt, amount: '10' },
        provider,
        recipient1Signer,
      ).build(),
    ),
  );

  const recipient1UdtBalance2 = await provider.getUdtBalance(await recipient1Signer.getAddress(), testUdt);
  expect(Number(recipient1UdtBalance2) === 90).toBe(true);
  const recipient2UdtBalance2 = await provider.getUdtBalance(await recipient2Signer.getAddress(), testUdt);
  expect(Number(recipient2UdtBalance2) === 10).toBe(true);
});

test('test rc with acp', async () => {
  // genesis -> rcSigner1(acp): 64 ckb
  //         -> rcSigner2(acp): 62 ckb
  // rcSigner1 -> rcSigner2: 1 ckb
  // expect(rcSigner1Balance < 63 ckb).toBe(true)
  // expect(rcSigner1Balance > 62.9 ckb).toBe(true)
  // expect(rcSigner2Balance  === 62 ckb).toBe(true)

  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(testPrivateKeysIndex);
  const rcSigner1 = new RCLockSigner(randomHexString(64), provider);
  const rcSigner2 = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc-lock

  await provider.sendTxUntilCommitted(
    await genesisSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [
            {
              recipient: await rcSigner1.getAddressByMode(RC_MODE.ACP),
              amount: '6400000000', //  100 CKB
              capacityPolicy: 'createAcp',
            },
            {
              recipient: await rcSigner2.getAddressByMode(RC_MODE.ACP),
              amount: '6200000000', //  65 CKB
              capacityPolicy: 'createAcp',
            },
          ],
        },
        provider,
        genesisSigner,
      ).build(),
    ),
  );

  const recipient = await rcSigner2.getAddressByMode(RC_MODE.ACP);
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
      rcSigner1,
    ).build(),
  );
  await provider.sendTxUntilCommitted(signed);
  const recipientBalance = await provider.getCkbLiveCellsBalance(recipient);
  expect(CkbAmount.fromShannon(recipientBalance).eq(CkbAmount.fromCkb(63))).toBe(true);
});

test('test eth rc signer', async () => {
  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(testPrivateKeysIndex);
  const rcSigner = new RCEthSigner(randomHexString(64), provider);
  await provider.sendTxUntilCommitted(
    await genesisSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [
            {
              recipient: await rcSigner.getAddress(),
              amount: '15000000000', //  100 CKB
              capacityPolicy: 'createAcp',
            },
          ],
        },
        provider,
        genesisSigner,
      ).build(),
    ),
  );

  // rc-lock -> ramdom-acp
  const recipient = provider.generateAcpSigner();

  await provider.sendTxUntilCommitted(
    await rcSigner.seal(
      await new TransferCkbBuilder(
        {
          recipients: [{ recipient: await recipient.getAddress(), amount: '6100000000', capacityPolicy: 'createAcp' }],
        },
        provider,
        rcSigner,
      ).build(),
    ),
  );
  const received = await provider.getCkbLiveCellsBalance(await recipient.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(61))).toBe(true);
});
