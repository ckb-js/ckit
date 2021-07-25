import { utils } from '@ckb-lumos/base';
import { ScriptConfig, predefined } from '@ckb-lumos/config-manager';
import { RPC } from '@ckb-lumos/rpc';
import { TippyClient } from '@ckit/tippy-client';
import { MercuryProvider } from '../providers/MercuryProvider';
import { randomHexString } from '../utils';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { MintSudtBuilder } from './MintSudtBuilder';

export async function loadSecp256k1ScriptConfig(rpc: RPC): Promise<ScriptConfig> {
  const genesisBlock = await rpc.get_block_by_number('0x0');

  if (!genesisBlock) throw new Error('cannot load genesis block');

  const secp256k1DepTxHash = genesisBlock.transactions[1]?.hash;
  const typeScript = genesisBlock.transactions[0]?.outputs[1]?.type;

  if (!secp256k1DepTxHash) throw new Error('Cannot load secp256k1 transaction');
  if (!typeScript) throw new Error('cannot load secp256k1 type script');

  const secp256k1TypeHash = utils.computeScriptHash(typeScript);

  return {
    HASH_TYPE: 'type',
    CODE_HASH: secp256k1TypeHash,
    INDEX: '0x0',
    TX_HASH: secp256k1DepTxHash,
    DEP_TYPE: 'dep_group',
  };
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const SECP256k1_BLAKE160_CONFIG = predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160!;

test.skip('test mint tx', async () => {
  const issuerPrivateKey = randomHexString(64);
  // TODO replace with another random key after any one can pay loaded
  const recipientPrivateKey = issuerPrivateKey;

  const tippy = new TippyClient();
  const SECP256K1_BLAKE160 = SECP256k1_BLAKE160_CONFIG;

  const issuerLockArgs = Secp256k1Signer.privateKeyToBlake160(issuerPrivateKey);
  const tippyInstance = await tippy.create_chain({
    assembler_lock_arg: issuerLockArgs,
    genesis_issued_cells: [
      {
        capacity: '0xffffffffffff',
        lock: {
          hash_type: SECP256K1_BLAKE160.HASH_TYPE,
          args: issuerLockArgs,
          code_hash: SECP256K1_BLAKE160.CODE_HASH,
        },
      },
    ],
  });
  await tippy.set_active_chain(tippyInstance.id);
  await tippy.start_chain();

  const provider = new MercuryProvider();
  await provider.init(predefined.AGGRON4);

  // TODO replace with an ACP lock
  const recipientAddress = provider.parseToAddress({
    hash_type: SECP256K1_BLAKE160.HASH_TYPE,
    code_hash: SECP256K1_BLAKE160.CODE_HASH,
    args: Secp256k1Signer.privateKeyToBlake160(recipientPrivateKey),
  });

  const signer = new Secp256k1Signer(issuerPrivateKey, provider, {
    code_hash: SECP256K1_BLAKE160.CODE_HASH,
    hash_type: SECP256K1_BLAKE160.HASH_TYPE,
  });

  const recipients = [
    {
      recipient: recipientAddress,
      additionalCapacity: '100000000',
      amount: '100000000',
    },
  ];
  const signedTx = await new MintSudtBuilder({ recipients }, provider, signer).build();

  const txHash = await provider.rpc.send_transaction(signedTx);
  const tx = await provider.waitForTransactionCommitted(txHash);

  expect(tx != null).toBe(true);
});
