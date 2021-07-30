# Development

## Start A Local Node For Developing

To start a ckb(http://localhost:8116) and a ckb-indexer(http://localhost:8114), we can

```
make start-docker
```

To deploy the requiring scripts, including

- sudt
- anyone-can-pay
- pw-non-anyone-can-pay
- pw-anyone-can-pay

Then we will see a `tmp` folder under the project root, which contains the deployment info.

```
# TODO: independent deploy script deploy-scripts
make test
```

## Output Debug Info

It is recommended to use [debug](https://github.com/visionmedia/debug) and the debug output of ckit should start with ckit-, e.g. `ckit-some-module`

```ts
import { createDebugger, debug } from '@ckit/base';

const debugSomeModule = createDebugger('ckit-some-module');

export function doSomething() {
  const obj = {};
  debugSomeModule('log obj, %o', obj);
  debug('default debugger');
}
```

To output the debug info, we should add an `DEBUG=ckit-*` in env variables

```
DEBUG=ckit,ckit-* node ckit-entry.js
```

## Run With `babel-node` For Debugging Locally

Sometimes we want to debug locally, but NodeJS can't run the .ts file directly, so we can use babel-node to run it

```
yarn babel-node -x ".ts" --config-file babel.config.json path/to/my/file.ts
```
