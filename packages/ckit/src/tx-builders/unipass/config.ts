// TODO
//  unipass is not open source at this stage,
//  there is only some sample code, when unipass is open source, you need to replace these codes
import { CellDep, DepType, OutPoint } from '@lay2/pw-core';

export const nets = [
  // {
  //   name: '本地',
  //   url: 'http://localhost:3000/'
  // },

  {
    name: 'dev',
    url: 'https://id.unipass.vip',
    model: 1,
  },
  {
    name: 'Aggron-Preview',
    url: 'https://t.unipass.xyz',
    model: 0,
  },
  {
    name: 'Lina-Preview',
    url: 'https://rc.unipass.xyz',
    model: 0,
  },

  {
    name: 'Lina',
    url: 'https://unipass.xyz',
  },
];

const AggronCellDeps = [
  new CellDep(DepType.code, new OutPoint('0x04a1ac7fe15e454741d3c5c9a409efb9a967714ad2f530870514417978a9f655', '0x0')),
  new CellDep(DepType.code, new OutPoint('0x03dd2a5594ed2d79196b396c83534e050ba0ad07fa5c1cd61a7094f9fb60a592', '0x0')),
  new CellDep(DepType.code, new OutPoint('0xd346695aa3293a84e9f985448668e9692892c959e7e83d6d8042e59c08b8cf5c', '0x0')),
  new CellDep(DepType.code, new OutPoint('0x194a0f84de41d006a07ece07c96a8130100818599fcf0b2ecf49e512b873ed6e', '0x2')),
];

const LinaCellDeps = [
  new CellDep(DepType.code, new OutPoint('0x5c98197999d04fbfa5eb579d0f1c85a3edac2b2f72164f2fc618b101adc71729', '0x0')),
  new CellDep(DepType.code, new OutPoint('0xf247a0e9dfe9d559ad8486428987071b65d441568075465c2810409e889f4081', '0x0')),
  new CellDep(DepType.code, new OutPoint('0x1196caaf9e45f1959ea3583f92914ee8306d42e27152f7068f9eeb52ac23eeae', '0x0')),
  new CellDep(DepType.code, new OutPoint('0xf5edd047b3dbd676c9aa1e5a77ff32e3661d154c306e23bb0c13f8da9133f145', '0x2')),
];

export function getCellDeps(isLina = false): CellDep[] {
  let data = AggronCellDeps;
  if (isLina) data = LinaCellDeps;
  return data;
}
