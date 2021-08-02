// import { Modal } from 'antd';
// import React from 'react';
// import { useMutation, UseMutationResult } from 'react-query';
// import { WalletContainer } from 'containers/WalletContainer';
// import { MintSudtBuilder } from 'ckit';
// import { Address, HexNumber, Hash } from '@ckb-lumos/base';
//
// export interface SendIssueTxInput {
//   recipient: Address;
//   amount: HexNumber;
// }
//
// export function useSendIssueTx(): UseMutationResult<{ txHash: Hash }, unknown, SendIssueTxInput> {
//   const { selectedWallet } = WalletContainer.useContainer();
//
//   return useMutation(
//     ['sendIssueTx'],
//     async (input: SendIssueTxInput) => {
//       if (!selectedWallet?.signer) throw new Error('exception: signer not set');
//       const txBuilder = new MintSudtBuilder(
//         { recipients: [{ recipient: input.recipient, amount: input.amount }] },
//         selectedWallet.ckitProvider,
//         selectedWallet.signer,
//       );
//       const issueTx = await txBuilder.build();
//       const txHash = await selectedWallet.ckitProvider.sendTransaction(issueTx);
//       return { txHash: txHash };
//     },
//     {
//       onSuccess({ txHash }) {
//         const fromNetwork = direction === BridgeDirection.In ? network : NERVOS_NETWORK;
//
//         Modal.success({
//           title: 'Bridge Tx sent',
//           content: (
//             <p>
//               The transaction was sent, check it in&nbsp;
//               <TransactionLink network={fromNetwork} txId={txId}>
//                 explorer
//               </TransactionLink>
//               <details>
//                 <summary>transaction id</summary>
//                 {txId}
//               </details>
//             </p>
//           ),
//         });
//       },
//       onError(error) {
//         const errorMsg: string = utils.hasProp(error, 'message') ? String(error.message) : 'Unknown error';
//         Modal.error({ title: 'Tx failed', content: errorMsg, width: 360 });
//       },
//     },
//   );
// }
