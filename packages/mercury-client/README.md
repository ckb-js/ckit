# @ckit/tippy-client

The RPC client of [Tippy](https://github.com/nervosnetwork/tippy)

## Usage

```ts
import { TippyClient } from '@ckit/tippy-client';

const client = new TippyClient('http://localhost:5000');
client.list_chains().then(console.log);
```
