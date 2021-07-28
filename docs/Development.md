# Development

## Output For Debugging

It is recommended to use [debug](https://github.com/visionmedia/debug) and the debug output of ckit should start with ckit-, e.g. `ckit-some-module`

```ts
import Debug from 'debug';

const debug = Debug('ckit-some-module');

export function doSomething() {
  const obj = {};
  debug('log obj, %o', obj);
}
```

## Run With `babel-node` For Debugging Locally

Sometimes we want to debug locally, but NodeJS can't run the .ts file directly, so we can use babel-node to run it

```

yarn babel-node -x ".ts" --config babel.config.json path/to/my/file.ts

```
