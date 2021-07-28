import { deployCkbScripts } from 'ckit/dist/deploy/deploy';
import { pathFromProjectRoot } from './index';

async function main() {
  const scriptPath = pathFromProjectRoot('/deps/build');
  console.log('script path', scriptPath);
  const ckbRpcUrl = 'http://127.0.0.1:8114';
  const mercuryUrl = 'http://127.0.0.1:8116';
  const ckbPrivateKey = '0xa800c82df5461756ae99b5c6677d019c98cc98c7786b80d7b2e77256e46ea1fe';

  const deployResult = await deployCkbScripts(scriptPath, ckbRpcUrl, mercuryUrl, ckbPrivateKey);
  console.log(deployResult);
}

main().catch((e) => {
  console.log('deploy error', e);
  process.exit(1);
});
