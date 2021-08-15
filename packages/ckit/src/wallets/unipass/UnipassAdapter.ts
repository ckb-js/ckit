import { utils } from '@ckb-lumos/base';
import { hexToBytes } from '../../utils';

interface UnipassRet<Data> {
  code: number;
  data: Data;
  info: string;
}

interface UnipassLoginData {
  email: string;
  pubkey: string;
  recovery: boolean;
}

interface UnipassSigData {
  sig: string;
  pubkey: string;
}

interface AdapterConfig {
  host: string;
  loginDataCacheKey: string;
}

export function pubkeyToLockArgs(pubkey: string): string {
  return utils.ckbHash(hexToBytes(pubkey).buffer).serializeJson().slice(0, 42);
}

export function getRetFromSearchParams<T = unknown>(): T | undefined {
  const searchParams = new URLSearchParams(location.search.slice(1));
  const json = searchParams.get('unipass_ret');

  if (!json) return undefined;

  const res = JSON.parse(json) as UnipassRet<T>;

  if (res.code !== 200) throw new Error(res.info || 'Unknown error when connecting to UniPass');
  searchParams.delete('unipass_ret');

  const { pathname, host, protocol } = window.location;

  const qs = searchParams.toString();
  const newUrl = `${protocol}//${host}${pathname}${qs ? `?${qs}` : ''}`;

  window.history.replaceState({ path: newUrl }, '', newUrl);
  return res.data;
}

export async function redirect(href: string): Promise<never> {
  window.location.href = href;
  return new Promise((resolve) => setTimeout(resolve, Infinity));
}

export class UnipassRedirectAdapter {
  private config: AdapterConfig;

  constructor(options: Partial<AdapterConfig>) {
    this.config = {
      host: options.host ?? 'https://unipass.xyz',
      loginDataCacheKey: options.loginDataCacheKey ?? '__unipass__',
    };
  }

  public checkIsLogged(): boolean {
    return !!(this.getLoginDataFromCache() ?? this.getLoginDataFromUrl());
  }

  /**
   * get unipass lock_args. If it is not retrieved from the cache or url, it will redirect to the unipass page
   */
  public async getLockArgs(): Promise<string> {
    const loginData = this.getLoginDataFromCache() ?? this.getLoginDataFromUrl() ?? (await this.redirectToLogin());
    return pubkeyToLockArgs(loginData.pubkey);
  }

  public sign(message: string): Promise<string> {
    return Promise.resolve(this.getSignatureFromUrl() ?? this.redirectToSign(message));
  }

  private redirectToLogin(): Promise<never> {
    const loginUrl = this.generateUnipassNewUrl(this.config.host, 'login', { success_url: window.location.origin });
    return redirect(loginUrl);
  }

  public redirectToSign(message: string): Promise<never> {
    const pubkey = this.getLoginDataFromCache()?.pubkey;

    if (!pubkey) throw new Error('UniPass should login before sign');

    const signUrl = this.generateUnipassNewUrl(this.config.host, 'sign', {
      success_url: window.location.origin,
      pubkey,
      message,
    });

    return redirect(signUrl);
  }

  private saveLoginDataToCache(data: UnipassLoginData): void {
    localStorage.setItem(this.config.loginDataCacheKey, JSON.stringify(data));
  }

  private getLoginDataFromCache(): UnipassLoginData | undefined {
    const serialized = localStorage.getItem(this.config.loginDataCacheKey);

    if (serialized == null) return;

    return JSON.parse(serialized) as UnipassLoginData;
  }

  private getLoginDataFromUrl(): UnipassLoginData | undefined {
    const loginData = getRetFromSearchParams<UnipassLoginData>();

    if (!loginData) return;

    this.saveLoginDataToCache(loginData);
    return loginData;
  }

  private getSignatureFromUrl(): string | undefined {
    const signature = getRetFromSearchParams<UnipassSigData>();
    return signature?.sig;
  }

  private generateUnipassNewUrl(host: string, action: string, params: Record<string, string>) {
    const urlObj = new URL(`${host}/${action.toLowerCase()}`);
    Object.entries(params).forEach(([key, val]) => urlObj.searchParams.set(key, val));
    return urlObj.href;
  }
}
