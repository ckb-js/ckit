import { TestProvider } from './TestProvider';

const globalSetup = async (): Promise<void> => {
  const provider = new TestProvider();
  await provider.init();
};

export default globalSetup;
