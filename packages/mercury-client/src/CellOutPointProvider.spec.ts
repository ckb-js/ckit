/* eslint-disable */
import { CellOutPointProvider } from '@ckitjs/base';
import { ProviderConfig, OutPointOpt, PromisableOutPointOpt } from '@ckitjs/base';
import { StaticFutureOutPointProvider } from './CellOutPointProvider';

const config = {
  lumosConfig: {
    PREFIX: 'ckt',
    SCRIPTS: {
      SUDT: {
        CODE_HASH: '0xe1e354d6d643ad42724d40967e334984534e0367405c5ae42a9d7d63d77df419',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x0',
        DEP_TYPE: 'code',
      },
      ANYONE_CAN_PAY: {
        CODE_HASH: '0xcd69ba816f7471e59110058aa37387c362ed9a240cd178f7bb1ecee386cb31e6',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x1',
        DEP_TYPE: 'code',
      },
      PW_ANYONE_CAN_PAY: {
        CODE_HASH: '0x093ba9759e1c4a79dd81b0a50de83ab108ffe4eb983b05637bf1f5c1834f31eb',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x2',
        DEP_TYPE: 'code',
      },
      PW_NON_ANYONE_CAN_PAY: {
        CODE_HASH: '0x87366c3678f14ccbd6647386a18e05ae27c97978d4a6952fb5820cc698263835',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x3',
        DEP_TYPE: 'code',
      },
      RC_LOCK: {
        CODE_HASH: '0x1bf147d1c95a5ad51016bd426c33f364257e685af54df26fc69ec40e3ae267d1',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x4',
        DEP_TYPE: 'code',
      },
      CHEQUE: {
        CODE_HASH: '0xbe734faa9ead3cfeef2efba92de6b6bdb5b0cadb6cd36c896081e8cab18e79b9',
        HASH_TYPE: 'data',
        TX_HASH: '0x4af8a7cb36cf8f3665ecc03e8c1da8dcc975a782d44e0b9168ce06d98fc591c5',
        INDEX: '0x5',
        DEP_TYPE: 'code',
      },
      SECP256K1_BLAKE160: {
        HASH_TYPE: 'type',
        CODE_HASH: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
        INDEX: '0x0',
        TX_HASH: '0xa777fd1964ffa98a7b0b6c09ff71691705d84d5ed1badfb14271a3a870bdd06b',
        DEP_TYPE: 'dep_group',
      },
      UNIPASS: {
        INDEX: '0x0',
        TX_HASH: '0x03dd2a5594ed2d79196b396c83534e050ba0ad07fa5c1cd61a7094f9fb60a592',
        DEP_TYPE: 'code',
        CODE_HASH: '0x124a60cd799e1fbca664196de46b3f7f0ecb7138133dcaea4893c51df5b02be6',
        HASH_TYPE: 'type',
      },
    },
    MIN_FEE_RATE: '0x3e8',
  },
};
test('test the dummy wallet', async () => {
  const staticFutureOutPointProvider = new StaticFutureOutPointProvider(config.lumosConfig as ProviderConfig, '');
            
  expect(staticFutureOutPointProvider).toBe(false);
});
