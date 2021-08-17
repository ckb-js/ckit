import { Hash } from '@ckb-lumos/base';
import { unimplemented } from '@ckit/utils';
import { useMutation, UseMutationResult } from 'react-query';
import { CkitProviderContainer } from '../containers';

export function useSendTransaction(): UseMutationResult<{ txHash: Hash }> {
  const provider = CkitProviderContainer.useContainer();

  return useMutation(async () => {
    unimplemented();
  });
}
