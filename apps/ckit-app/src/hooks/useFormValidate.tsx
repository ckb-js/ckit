import { Address, Script } from '@ckb-lumos/base';
import { useCallback } from 'react';
import { useProvider } from 'containers';
import { AssetAmount } from 'utils';

interface ValidationHelper {
  validateCkbAddress: (value: Address) => string | undefined;
  validateInviteAddress: (value: Address, sudtScript: Script) => Promise<string | undefined>;
  validateIssueAddress: (value: Address, sudtScript: Script) => Promise<string | undefined>;
  validateTransferAddress: (value: Address, sudtScript: Script) => Promise<string | undefined>;
  validateAmount: (amount: string, decimal: number) => string | undefined;
}

export function useFormValidate(): ValidationHelper {
  const provider = useProvider();

  const validateCkbAddress = useCallback(
    (value: Address) => {
      try {
        provider.parseToScript(value);
      } catch (e) {
        return 'invalid ckb address';
      }
    },
    [provider],
  );

  const isLockscriptACP = useCallback(
    (script: Script) => {
      const scripts = provider.config.SCRIPTS;
      return (
        script.code_hash === scripts.ANYONE_CAN_PAY.CODE_HASH ||
        script.code_hash === scripts.PW_ANYONE_CAN_PAY.CODE_HASH ||
        script.code_hash === scripts.UNIPASS.CODE_HASH
      );
    },
    [provider],
  );

  const validateACPAddress = useCallback(
    (value: Address) => {
      const error = validateCkbAddress(value);
      if (error) return error;
      if (!isLockscriptACP(provider.parseToScript(value))) return 'address not anyone can pay';
    },
    [provider, validateCkbAddress, isLockscriptACP],
  );

  const validateInviteAddress = useCallback(
    async (value: Address, sudtScript: Script) => {
      const error = validateACPAddress(value);
      if (error) return error;
      const sudtCells = await provider.collectUdtCells(value, sudtScript, '0');
      if (sudtCells.length > 0) return 'already invited';
    },
    [provider, validateACPAddress],
  );

  const validateIssueAddress = useCallback(
    async (value: Address, sudtScript: Script) => {
      const error = validateACPAddress(value);
      if (error) return error;
      const sudtCells = await provider.collectUdtCells(value, sudtScript, '0');
      if (sudtCells.length === 0) return 'please invite first';
    },
    [provider, validateACPAddress],
  );

  const validateTransferAddress = useCallback(
    async (value: Address, sudtScript: Script) => {
      const error = validateACPAddress(value);
      if (error) return error;
      const sudtCells = await provider.collectUdtCells(value, sudtScript, '0');
      if (sudtCells.length === 0) return 'no available acp sudt cell for recipient';
    },
    [provider, validateACPAddress],
  );

  const validateAmount = useCallback((amount: string, decimal: number) => {
    const assetAmount = AssetAmount.fromHumanize(amount, decimal);
    if (assetAmount.rawAmount.isNaN()) return 'amount should be number';
    if (assetAmount.rawAmount.lt(1)) return 'at least issue one token';
  }, []);

  return { validateCkbAddress, validateInviteAddress, validateIssueAddress, validateTransferAddress, validateAmount };
}
