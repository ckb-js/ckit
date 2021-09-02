import { CkitProvider, CreateRcUdtInfoCellBuilder, predefined, internal, RcSupplyLockHelper } from '@ckit/ckit';

const { RcInternalSigner } = internal;

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
}

async function createUdt() {
  const { provider, signer } = await getContext();

  const tx = await new CreateRcUdtInfoCellBuilder(
    {
      rcIdentity: signer.getRcIdentity(),
      sudtInfo: {
        name: 'Hello',
        symbol: 'Ho',
        maxSupply: '10000000000',
        description: 'a hello world token',
        decimals: 8,
      },
    },
    provider,
  ).build();

  const signed = await signer.seal(tx);

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

  console.log(JSON.stringify(sudts, null, 2));
}

showBasicInfo();
// createUdt();
// listUdt();
