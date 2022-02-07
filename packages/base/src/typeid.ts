import { HexNumber, Input, Script, utils } from '@ckb-lumos/base';

export function generateTypeIdScript(input: Input, outputIndex: HexNumber): Script {
  return utils.generateTypeIdScript(input, outputIndex);
}
