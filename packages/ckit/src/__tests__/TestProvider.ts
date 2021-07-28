import { HexNumber, HexString } from '@ckb-lumos/base';
import { Config, predefined } from '@ckb-lumos/config-manager';
import { TippyClient } from '@ckit/tippy-client';
import appRootPath from 'app-root-path';
import { CkitProvider } from '../providers/CkitProvider';
import { nonNullable, randomHexString, unimplemented } from '../utils';
import { deployCkbScripts } from '../deploy/deploy';

export class TestProvider extends CkitProvider {
  readonly #_assemberPrivateKey: HexString;
  setupStatus: 'idle' | 'pending' | 'fulfilled' | 'rejected' = 'idle';

  constructor() {
    super();
    this.#_assemberPrivateKey = randomHexString(64);

    void this.deployDeps();
  }

  override async init(): Promise<void> {
    const config = await this.deployDeps();
    await super.init(config);
  }

  get assemberPrivateKey(): HexString {
    return this.#_assemberPrivateKey;
  }

  private async deployDeps(): Promise<Config> {
    if (this.setupStatus === 'pending' || this.setupStatus === 'fulfilled') throw new Error('is deploying');

    this.setupStatus = 'pending';

    // TODO deploy deps
    console.log(appRootPath + '/deps');

    const depsPath = appRootPath + '/deps/build';
    const ckbRpcUrl = 'http://127.0.0.1:8114';
    const mercuryUrl = 'http://127.0.0.1:8116';
    const ckbPrivateKey = '0xa800c82df5461756ae99b5c6677d019c98cc98c7786b80d7b2e77256e46ea1fe';

    const scriptConfigs = await deployCkbScripts(depsPath, ckbRpcUrl, mercuryUrl, ckbPrivateKey);
    return {
      PREFIX: 'testnet',
      SCRIPTS: scriptConfigs,
    };
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
