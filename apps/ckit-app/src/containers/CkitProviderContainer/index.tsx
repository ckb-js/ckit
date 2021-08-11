import { CkitProvider } from '@ckit/ckit';
import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import { useConfigStorage } from 'hooks/useConfigStorage';

export const CkitProviderContainer = createContainer<CkitProvider | undefined>(() => {
  const [ckitProvider, setCkitProvider] = useState<CkitProvider>();
  const [localConfig] = useConfigStorage();
  useEffect(() => {
    const provider = new CkitProvider(localConfig.mecuryRPC, localConfig.ckbRPC);
    void provider.init({ ...localConfig.ckitConfig }).then(() => setCkitProvider(provider));
  }, [localConfig]);

  return ckitProvider;
});
