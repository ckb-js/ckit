import { CkbAmount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  CreateRcUdtInfoCellBuilder,
  MintRcUdtBuilder,
  RcSupplyLockHelper,
  TransferCkbBuilder,
} from '../tx-builders';
import { nonNullable, randomHexString } from '../utils';
import { RcInternalSigner } from '../wallets/RcInternalSigner';
import { TestProvider } from './TestProvider';

const testPrivateKeysIndex = 0;
jest.setTimeout(120000);

// TODO remove skip when rc-lock related modules are implemented
test('test rc signer', async () => {
  const provider = new TestProvider();
  await provider.init();

  const rcSigner = new RcInternalSigner(randomHexString(64), provider);

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

// TODO test with RC eth identity
test.skip('test rc eth identity', () => {
  // TODO
});
