import fs from 'fs';
import { Address, Hash, HexNumber, HexString, Script, Transaction } from '@ckb-lumos/base';
import { predefined } from '@ckb-lumos/config-manager';
import { EntrySigner } from '@ckitjs/base';
import { TippyClient } from '@ckitjs/tippy-client';
import { createDebugger, debug } from '@ckitjs/utils';
import appRootPath from 'app-root-path';
import { CkitConfig, CkitConfigKeys, CkitProvider } from '../providers';
import { AbstractTransactionBuilder, MintOptions, MintSudtBuilder, TransferCkbBuilder } from '../tx-builders';
import { nonNullable, randomHexString } from '../utils';
import { Secp256k1Signer } from '../wallets/Secp256k1Wallet';
import { deployCkbScripts } from './deploy';

export class TestProvider extends CkitProvider {
  public readonly debug = createDebugger('ckit-test');
  readonly #_assemberPrivateKey: HexString;
  setupStatus: 'idle' | 'pending' | 'fulfilled' | 'rejected' = 'idle';

  readonly testPrivateKeys: HexString[];

  constructor() {
    super();

    // each private key locks 20_000_000_000_00000000 ckBytes
    this.testPrivateKeys = [
      '0xd00c06bfd800d27397002dca6fb0993d5ba6399b4238b2f29ee9deb97593d2bc',
      '0x63d86723e08f0f813a36ce6aa123bb2289d90680ae1e99d4de8cdb334553f24d',
      '0xa800c82df5461756ae99b5c6677d019c98cc98c7786b80d7b2e77256e46ea1fe',
      '0xa6b8e0cbadda5c0d91cf82d1e8d8120b755aa06bc49030ca6e8392458c65fc80',
      '0x13b08bb054d5dd04013156dced8ba2ce4d8cc5973e10d905a228ea1abc267e60',
      '0xa6b023fec4fc492c23c0e999ab03b01a6ca5524a3560725887a8de4362f9c9cc',
    ];

    this.#_assemberPrivateKey = '0xd00c06bfd800d27397002dca6fb0993d5ba6399b4238b2f29ee9deb97593d2bc';
  }

  override async init(): Promise<void> {
    const config = await this.deployDeps();
    await super.init(config);
  }

  get assemberPrivateKey(): HexString {
    return this.#_assemberPrivateKey;
  }

  getGenesisSigner(index: number): Secp256k1Signer {
    return new Secp256k1Signer(nonNullable(this.testPrivateKeys[index]), this, this.newScript('SECP256K1_BLAKE160'));
  }

  private async deployDeps(): Promise<CkitConfig> {
    if (this.setupStatus === 'pending' || this.setupStatus === 'fulfilled') throw new Error('is deploying');

    this.setupStatus = 'pending';

    const deployedCachePath = appRootPath.resolve('/tmp/lumos-config.json');
    const cachedDeployConfig = fs.existsSync(deployedCachePath);
    if (cachedDeployConfig) {
      this.setupStatus = 'fulfilled';
      const lumosConfig = JSON.parse(fs.readFileSync(deployedCachePath).toString()).lumosConfig as CkitConfig;
      debug('read scripts info from cache %o', lumosConfig);
      return lumosConfig;
    } else {
      fs.mkdirSync(appRootPath.resolve('/tmp'));
    }

    debug('scripts are deploying via %s', this.assemberPrivateKey);
    const scripts = await deployCkbScripts(appRootPath.resolve('/deps/build'), this, this.#_assemberPrivateKey);
    const config: CkitConfig = {
      PREFIX: 'ckt',
      SCRIPTS: scripts,
      FUTURE_SCRIPTS: {},
      MIN_FEE_RATE: (await this.getTxPoolInfo()).min_fee_rate,
    };
    fs.writeFileSync(deployedCachePath, JSON.stringify({ lumosConfig: config }, null, 2));
    debug('scripts are deployed %o', config);
    return config;
  }

  async sendTxUntilCommitted(
    signed: Transaction,
    options: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<Hash> {
    const txHash = await this.sendTransaction(signed);
    const txWithStatus = await this.waitForTransactionCommitted(txHash, options);

    if (!txWithStatus) throw new Error(`timeout for ${txHash}, the tx is : ${JSON.stringify(signed)}`);

    return txHash;
  }

  generateAcpSigner(key: CkitConfigKeys = 'ANYONE_CAN_PAY'): Secp256k1Signer {
    return new Secp256k1Signer(randomHexString(64), this, this.newScript(key));
  }

  async transferCkbFromGenesis(
    recipient: Address,
    amount: HexNumber,
    config: { testPrivateKeysIndex?: number } = {},
  ): Promise<Hash> {
    const { testPrivateKeysIndex = 0 } = config;
    return this.sendTxUntilCommitted(
      await this.getGenesisSigner(testPrivateKeysIndex).seal(
        await new TransferCkbBuilder(
          {
            recipients: [{ recipient, capacityPolicy: 'createCell', amount }],
          },
          this,
          await this.getGenesisSigner(testPrivateKeysIndex).getAddress(),
        ).build(),
      ),
    );
  }

  async mintSudtFromGenesis(
    options: MintOptions,
    config: { testPrivateKeysIndex?: number } = {},
  ): Promise<{ sudt: Script; txHash: Hash }> {
    const { testPrivateKeysIndex = 0 } = config;

    const signer = this.getGenesisSigner(testPrivateKeysIndex);
    const unsigned = new MintSudtBuilder(options, this, signer.getAddress());

    return {
      sudt: this.newSudtScript(signer.getAddress()),
      txHash: await this.signAndSendTxUntilCommitted(signer, unsigned),
    };
  }

  async signAndSendTxUntilCommitted(signer: EntrySigner, builder: AbstractTransactionBuilder): Promise<Hash> {
    const unsigned = await builder.build();
    return this.sendTxUntilCommitted(await signer.seal(unsigned));
  }
}

interface GenesisOptions {
  assemberLockArgs: HexString;
  genesisIssued: { lockArgs: HexString; capacity: HexNumber }[];
}

export class TestProviderFactory {
  private builtChains: number;
  private tippy: TippyClient;

  private constructor(tippyRpc: string) {
    this.tippy = new TippyClient(tippyRpc);
    this.builtChains = 0;
  }

  static create(tippyRpc = 'http://127.0.0.1:5000'): TestProviderFactory {
    return new TestProviderFactory(tippyRpc);
  }

  async buildProvider(options: GenesisOptions): Promise<void> {
    this.builtChains++;

    const { tippy } = this;

    const secp256k1Config = nonNullable(predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160);

    await tippy.create_chain({
      assembler_lock_arg: options.assemberLockArgs,
      genesis_issued_cells: options.genesisIssued.map((issued) => ({
        capacity: issued.capacity,
        lock: {
          hash_type: secp256k1Config.HASH_TYPE,
          code_hash: secp256k1Config.CODE_HASH,
          args: issued.lockArgs,
        },
      })),
    });
  }
}
