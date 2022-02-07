import {
  CkitProvider,
  CreateRcUdtInfoCellBuilder,
  predefined,
  internal,
  RcSupplyLockHelper,
  MintRcUdtBuilder,
  helpers,
} from '@ckitjs/ckit';

const { RcSecp256k1Signer: RcInternalSigner } = internal;

const privateKey = '0x9cb72bc1f96926f8386111266d76f2e9ca8c1f0614b0ddd7fbad1abc90f23c8e';

async function getContext() {
  const provider = new CkitProvider('https://testnet.ckb.dev/indexer', 'https://testnet.ckb.dev/rpc');
  await provider.init(predefined.Aggron);

  const signer = new RcInternalSigner(privateKey, provider);

  return { provider, signer };
}

async function showBasicInfo() {
  const { provider, signer } = await getContext();

  const address = signer.getAddress();
  console.log(`address is : ${address}`);

  const lock = provider.parseToScript(address);
  console.log(`lock is : ${JSON.stringify(lock)}`);

  const ckbBalance = await provider.getCkbLiveCellsBalance(address);
  console.log(`ckb balance is: ${ckbBalance}`);

  const rcIdentity = signer.getRcIdentity();
  console.log('rc identity is: ', rcIdentity);
}

async function createUdt() {
  const { provider, signer } = await getContext();

  const unsigned = await new CreateRcUdtInfoCellBuilder(
    {
      rcIdentity: signer.getRcIdentity(),
      sudtInfo: {
        name: 'Test Token',
        symbol: 'TT',
        maxSupply: '10000000000000000',
        description: 'a hello world token',
        decimals: 8,
      },
    },
    provider,
  ).build();

  const signed = await signer.seal(unsigned);

  const txHash = await provider.sendTransaction(signed);
  console.log(`udt has created with txHash: ${txHash}`);
}

async function listUdt() {
  const { signer, provider } = await getContext();

  const helper = new RcSupplyLockHelper(provider.mercury, {
    rcLock: provider.newScriptTemplate('RC_LOCK'),
    sudtType: provider.newScriptTemplate('SUDT'),
  });

  const sudts = await helper.listCreatedSudt({ rcIdentity: signer.getRcIdentity() });

  sudts.forEach((sudt) => {
    const issuerLockScript = helper.newRcSupplyLockScript(sudt);
    console.log('sudt issuer lock: ', issuerLockScript);

    const sudtTypeScript = helper.newSudtScript(sudt);
    console.log('sudt type script', sudtTypeScript);

    console.log(`sudt(${sudt.name}) info is: `, sudt);
  });
}

async function mintUdt() {
  // from listUdt[n].udtId
  const udtId = '0x1e1815c526770f4ef6a32081df26696b29b3a8d2b7a9eab6b7b7fc01e2a07ad6';

  const recipients = [
    {
      recipient: 'ckt1qsfy5cxd0x0pl09xvsvkmert8alsajm38qfnmjh2fzfu2804kq47drjt08nt3vr7lyaxt5ph99p9h309tfqvqrhgtnf',
      amount: '10000000000', // 10_000_000_000
      capacityPolicy: 'createCell' as const, // as const to treat TypeScript compiler
      additionalCapacity: helpers.CkbAmount.fromCkb('1').toHex(), // additional 1 capacity for tx fee
    },
  ];

  const { signer, provider } = await getContext();

  const unsigned = await new MintRcUdtBuilder(
    {
      rcIdentity: signer.getRcIdentity(),
      udtId,
      recipients,
    },
    provider,
  ).build();

  const signed = await signer.seal(unsigned);

  const txHash = await provider.sendTransaction(signed);
  console.log(`udt has minted with txHash: ${txHash}`);
}

async function queryUdtBalance() {
  const { provider, signer } = await getContext();

  // const mercury = new MercuryClient('https://testnet.ckb.dev/indexer');
  const mercury = provider.mercury;

  const helper = new RcSupplyLockHelper(mercury, {
    rcLock: provider.newScriptTemplate('RC_LOCK'),
    sudtType: provider.newScriptTemplate('SUDT'),
  });

  const sudtScript = helper.newSudtScript({
    rcIdentity: signer.getRcIdentity(),
    udtId: '0x126e754aaa32898714e0466d885f4bb5ffe1723e05acf944b06b2bc9ff3a3a0a',
  });

  const balance = await provider.getUdtBalance(
    'ckt1q2rnvmpk0rc5ej7kv3ecdgvwqkhz0jte0r22d9f0kkpqe35cycur2myv07qpv9y9c0j2mnk6f3kyy4qszsq9g2qxr8j',
    sudtScript,
  );

  console.log(balance);
}

showBasicInfo();
// createUdt();
// listUdt();
// mintUdt();
// queryUdtBalance();
