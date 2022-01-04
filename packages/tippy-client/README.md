# @ckitjs/tippy-client

The RPC client of [Tippy](https://github.com/nervosnetwork/tippy)

## Usage

```ts
import { TippyClient } from '@ckitjs/tippy-client';

const client = new TippyClient('http://localhost:5000/api');
client.list_chains().then(console.log);
```
