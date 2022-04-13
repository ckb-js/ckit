import { Hexadecimal } from '@ckb-lumos/base';
import { Config as LumosConfig } from '@ckb-lumos/config-manager';

export type OptionalConfig = {
  MIN_FEE_RATE: Hexadecimal;
};
export type ProviderConfig = LumosConfig & OptionalConfig;
export type InitOptions<T extends LumosConfig = LumosConfig> = Omit<T, keyof OptionalConfig> & Partial<OptionalConfig>;
