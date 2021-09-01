# @ckit/easy-byte

## Quick Start

### Work With Struct

```ts
import { createFixedStruct, U8, U64LE } from '@ckit/easy-byte';

// prettier-ignore
// define the struct first
const messageStruct = createFixedStruct()
  .field('messageHeader', U8)
  .field('messageBody', U64LE);

const buf = messageStruct.encode({
  messageHeader: 0x01,
  // A value of u64 may exceed MAX_SAFE_INTEGER, so use a bigint to store this value
  // The built-in field parsing U64le also only supports reading and writing bigint
  messageBody: 0xffffffffffffffffn,
});

console.log(buf.tostring('hex')); // 01ffffffffffffffff

// also read a bytes and parse to an JS Object
console.log(messageStruct.decode(buf)); // { messageHeader: 0x01, messageBody: 0xffffffffffffffffn }
```

### Custom Work Pipe

```ts
import {
  pipe,
  convertEndian,
  pad0x,
  prependZeroToEvenLength,
  rm0x,
} from '@ckit/easy-byte';

const customFormat = pipe(
  rm0x,
  prependZeroToEvenLength,
  convertEndian,
  pad0x,
);
customFormat('0x001020304'); // 0x0403020100
```

### Or Work With `formatByteLike`

```ts
import { formatByteLike } from '@ckit/easy-byte';

// format a big endian byte string to big endian
// (0x)  0_01_02_03_04
// (0x) 04_03_02_01_00
const formated = formatByteLike('0x001020304', {
  convertEndian: true,
  rm0x: true,
  byteSize: 8,
});
console.log(formated); // 0403020100000000
```
