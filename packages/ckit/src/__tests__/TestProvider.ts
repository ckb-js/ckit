import fs from 'fs';
import { HexNumber, HexString } from '@ckb-lumos/base';
import { predefined } from '@ckb-lumos/config-manager';
import { debug } from '@ckit/base';
import { TippyClient } from '@ckit/tippy-client';
import appRootPath from 'app-root-path';
import { deployCkbScripts } from '../__tests__/deploy';
import { CkitConfig, CkitProvider } from '../providers/CkitProvider';
import { nonNullable } from '../utils';

export class TestProvider extends CkitProvider {
  readonly #_assemberPrivateKey: HexString;
  setupStatus: 'idle' | 'pending' | 'fulfilled' | 'rejected' = 'idle';

  constructor() {
    super();
    // ba_args: 0xc8328aabcd9b9e8e64fbc566c4385c3bdeb219d7
    // it is the default tippy ba_args
    this.#_assemberPrivateKey = '0xd00c06bfd800d27397002dca6fb0993d5ba6399b4238b2f29ee9deb97593d2bc';
  }

  override async init(): Promise<void> {
    const config = await this.deployDeps();
    await super.init(config);
  }

  get assemberPrivateKey(): HexString {
    return this.#_assemberPrivateKey;
  }

  private async deployDeps(): Promise<CkitConfig> {
    if (this.setupStatus === 'pending' || this.setupStatus === 'fulfilled') throw new Error('is deploying');

    this.setupStatus = 'pending';

    const deployedCachePath = appRootPath.resolve('/tmp/lumos-config.json');
    const cachedDeployConfig = fs.existsSync(deployedCachePath);
    if (cachedDeployConfig) {
      this.setupStatus = 'fulfilled';
      const lumosConfig = JSON.parse(fs.readFileSync(deployedCachePath).toString()) as CkitConfig;
      debug('deploy info from cache %o', lumosConfig);
      return lumosConfig;
    }

    const scripts = await deployCkbScripts(appRootPath.resolve('/deps/build'), this, this.#_assemberPrivateKey);
    const config = { PREFIX: 'ckt', SCRIPTS: scripts };
    fs.writeFileSync(deployedCachePath, JSON.stringify(config, null, 2));
    return config;
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
