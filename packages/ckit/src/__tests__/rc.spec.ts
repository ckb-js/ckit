import {CkbAmount} from '../helpers';
import {
  AcpTransferSudtBuilder,
  CreateRcUdtInfoCellBuilder,
  MintRcUdtBuilder,
  TransferCkbBuilder,
} from '../tx-builders';
import {randomHexString} from '../utils';
import {InternalRcPwSigner, RC_MODE, RCEthSigner, RCLockSigner} from '../wallets/RcWallet';
import {TestProvider} from './TestProvider';



// TODO remove skip when rc-lock related modules are implemented
test.skip('test rc signer', async () => {
  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const rcSigner = new RCLockSigner(randomHexString(64), provider);

  // genesis --100M ckb-> rc
  await provider.transferCkbFromGenesis(await rcSigner.getAddress(), CkbAmount.fromCkb(1000000).toHex(), {
    testPrivateKeysIndex: 3,
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

  const received = await provider.getCkbLiveCellsBalance(await rcSigner.getAddress());
  expect(CkbAmount.fromShannon(received).eq(CkbAmount.fromCkb(100))).toBe(true);
});

// TODO remove skip when rc-lock related modules are implemented
test.skip('test rc udt lock', async () => {
  const provider = new TestProvider();
  await provider.init();

  const issuerSigner = new InternalRcPwSigner(randomHexString(64), provider);

  // genesis --100M ckb-> rc
  await provider.transferCkbFromGenesis(await issuerSigner.getAddress(), '100000000000000', {
    testPrivateKeysIndex: 3,
  });

  // create a rc udt info cell
  const createRcUdtInfoTxBuilder = new CreateRcUdtInfoCellBuilder(
    {
      rcIdentity: await issuerSigner.getRcIdentity(),
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

  const recipient1Signer = provider.generateAcpSigner();
  // issuer -> recipient1: 100 udt
  await provider.sendTxUntilCommitted(
    await issuerSigner.seal(
      await new MintRcUdtBuilder(
        {
          udtId: createRcUdtInfoTxBuilder.getTypeHash(),
          recipients: [
            {
              recipient: await recipient1Signer.getAddress(),
              // 1ckb additional capacity for tx fee
              additionalCapacity: CkbAmount.fromCkb(1).toHex(),
              capacityPolicy: 'createAcp',
              amount: '100',
            },
          ],
        },
        provider,
      ).build(),
    ),
  );

  const testUdt = provider.newSudtScript(createRcUdtInfoTxBuilder.getIssuerLockHash());
  const recipient1UdtBalance1 = await provider.getUdtBalance(await recipient1Signer.getAddress(), testUdt);

  expect(Number(recipient1UdtBalance1) === 100).toBe(true);

  const recipient2Signer = provider.generateAcpSigner();
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
  // genesis -> rcSigner1(acp): 100M ckb
  //         -> rcSigner2(acp): 61 ckb

  // rcSigner1 -> rcSigner2: 1 ckb
  // rcSigner1 balance: 999998.999...

  // rcSigner2 balance: 62 ckb

  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(1);
  const rcSigner1 = new RCLockSigner(randomHexString(64), provider);
  const rcSigner2 = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc-lock


  const builder = new TransferCkbBuilder(
      {
        recipients: [
          {
            recipient: await rcSigner1.getAddressByMode(RC_MODE.ACP),
            amount: '15000000000', //  100 CKB
            capacityPolicy: 'createAcp',
          },
          {
            recipient: await rcSigner2.getAddressByMode(RC_MODE.ACP),
            amount: '6100000000', //  100 CKB
            capacityPolicy: 'createAcp',
          },
        ],
      },
      provider,
      genesisSigner,
  );
  await provider.sendTxUntilCommitted(await genesisSigner.seal(await builder.build()));

  // rc-lock -> genesis
  const tx = await new TransferCkbBuilder(
      {
        recipients: [{ recipient: await rcSigner1.getAddressByMode(RC_MODE.ACP), amount: '100000000', capacityPolicy: 'createAcp' }],
      },
      provider,
      rcSigner1,
  ).build();
  const signed = await rcSigner1.seal(tx);
  console.log(`signed tx is ${JSON.stringify(signed,null,2)}`);
  await provider.sendTxUntilCommitted(signed);
});

test('test rc signer 1', async () => {
  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(1);
  const rcSigner = new RCLockSigner(randomHexString(64), provider);

  // genesis -> rc-lock

  const address = await rcSigner.getAddress();
  console.log(`address is ${address}`);

  const builder = new TransferCkbBuilder(
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
  );
  await provider.sendTxUntilCommitted(await genesisSigner.seal(await builder.build()));

  // rc-lock -> genesis
  const tx = await new TransferCkbBuilder(
      {
        recipients: [{ recipient: await genesisSigner.getAddress(), amount: '6100000000', capacityPolicy: 'createAcp' }],
      },
      provider,
      rcSigner,
  ).build();
  const signed = await rcSigner.seal(tx);
  console.log(`signed tx is ${JSON.stringify(signed,null,2)}`);
  await provider.sendTxUntilCommitted(signed);
});
test('test eth rc signer', async () => {
  jest.setTimeout(120000);
  const provider = new TestProvider();
  await provider.init();

  const genesisSigner = provider.getGenesisSigner(1);
  const rcSigner = new RCEthSigner(randomHexString(64), provider);

  // genesis -> rc-lock

  const address = await rcSigner.getAddress();
  console.log(`address is ${address}`);

  const builder = new TransferCkbBuilder(
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
  );
  await provider.sendTxUntilCommitted(await genesisSigner.seal(await builder.build()));

  // rc-lock -> genesis
  const tx = await new TransferCkbBuilder(
      {
        recipients: [{ recipient: await genesisSigner.getAddress(), amount: '6100000000', capacityPolicy: 'createAcp' }],
      },
      provider,
      rcSigner,
  ).build();
  const signed = await rcSigner.seal(tx);
  console.log(`signed tx is ${JSON.stringify(signed,null,2)}`);
  await provider.sendTxUntilCommitted(signed);
});
