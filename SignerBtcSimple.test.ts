import { SignerBtcSimple } from './SignerBtcSimple';
import { MockClient } from './MockClient';
import { TransactionLike, CellOutputLike, ScriptLike, HexLike } from "@ckb-ccc/core";
import { CellDepLike } from "@ckb-ccc/core/src/ckb/transaction";


describe('SignerBtcSimple Tests', () => {
  let client: MockClient;
  let signer: SignerBtcSimple;

  beforeEach(() => {
    client = new MockClient();
    signer = new SignerBtcSimple(client);
  });

  test('prepareTransaction should process transaction correctly', async () => {
    const cellDeps: CellDepLike[] = [
      {
        depType: 'code',
        outPoint: {
          txHash: '0x1dbed8dcfe0f18359c65c5e9546fd15cd69de73ea0a502345be30180649c9467',
          index: 7
        }
      },
      {
        depType: 'dep_group',
        outPoint: {
          txHash: '0x75be96e1871693f030db27ddae47890a28ab180e88e36ebb3575d9f1377d3da7',
          index: 0
        }
      }
    ];
    const outputs: CellOutputLike[] = [
      {
        capacity: "20000000000",
        lock: {
          args: '0xf6ca1c08a40ab3d00e2299930cf0f8c298a1a90d',
          codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
          hashType: 'type'
        } as ScriptLike
      },
      {
        capacity: "79999999215",
        lock: {
          args: '0x04efddfdb4cd5211ccd5457e6c237cabcad14d4f3900',
          codeHash: '0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56',
          hashType: 'type'
        } as ScriptLike
      }
    ];

    const transactionLike: TransactionLike = {
      version: BigInt(0),
      cellDeps: cellDeps,
      headerDeps: [],
      inputs: [
        {
          previousOutput: {
            txHash: '0x29643a7b597e17578be682e5c6dbd223ad7fe6c9693bc8d7efad250f9fbf4f40',
            index: 1
          },
          since: BigInt(0)
        }
      ],
      outputs: outputs,
      outputsData: ["0x", "0x"],
      witnesses: []
    };

    const preparedTransaction = await signer.prepareTransaction(transactionLike);
    console.log("preparedTransaction: ", preparedTransaction)

    expect(preparedTransaction.version).toEqual(BigInt(0));
  });
});
