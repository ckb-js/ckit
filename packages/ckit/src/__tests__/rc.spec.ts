import { CkbAmount } from '../helpers';
import {
  AcpTransferSudtBuilder,
  CreateRcUdtInfoCellBuilder,
  MintRcUdtBuilder,
  TransferCkbBuilder,
} from '../tx-builders';
import { randomHexString } from '../utils';
import { InternalRcPwSigner } from '../wallets/RcWallet';
import { TestProvider } from './TestProvider';

// TODO remove skip when rc-lock related modules are implemented
test.skip('test rc signer', async () => {
  const provider = new TestProvider();
  await provider.init();

  const rcSigner = new InternalRcPwSigner(randomHexString(64), provider);

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
