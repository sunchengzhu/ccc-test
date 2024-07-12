import {
  CellDep,
  CellInput,
  CellOutput,
  Client,
  ClientFindCellsResponse,
  ClientIndexerSearchKeyLike,
  ClientTransactionResponse,
  depTypeFrom,
  HexLike,
  KnownScript,
  Num,
  OutPoint,
  Script,
  Transaction,
  TransactionLike
} from "@ckb-ccc/core";

export class MockClient extends Client {

  private url_: string = "http://localhost:8114";

  get url(): string {
    return this.url_;
  }

  get addressPrefix(): string {
    return "ckt";
  }

  async getKnownScript(script: KnownScript): Promise<Pick<Script, "codeHash" | "hashType">> {
    // https://github.com/RetricSu/offckb/blob/777bd83419469c33112ba12a10a56848cf003742/src/cmd/develop/lumos-config.ts#L51
    return {
      codeHash: "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
      hashType: "type",
    };
  }

  async sendTransaction(transaction: TransactionLike): Promise<`0x${string}`> {
    const txHash = `0x${Math.random().toString(16).slice(2)}`;
    return txHash as `0x${string}`;
  }

  async getTransaction(txHash: HexLike): Promise<ClientTransactionResponse | null> {
    const cellDeps = [
      new CellDep(
        new OutPoint("0x1dbed8dcfe0f18359c65c5e9546fd15cd69de73ea0a502345be30180649c9467", BigInt(7)),
        depTypeFrom("code")
      ),
      new CellDep(
        new OutPoint("0x75be96e1871693f030db27ddae47890a28ab180e88e36ebb3575d9f1377d3da7", BigInt(0)),
        depTypeFrom("dep_group")
      )
    ];

    const inputs = [
      new CellInput(
        new OutPoint(
          "0xacddc1f174d20cfdfdfd37b1b4a081c04fc3493a9be456e047cdb17bbb935608",
          BigInt(1)
        ),
        BigInt(0)
      )
    ];

    const outputs = [
      new CellOutput(
        BigInt(20000000000),  // converting CKB to shannon
        new Script(
          "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
          "type",
          "0xf6ca1c08a40ab3d00e2299930cf0f8c298a1a90d"
        ),
        undefined
      ),
      new CellOutput(
        BigInt(79999999215),
        new Script(
          "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
          "type",
          "0x04efddfdb4cd5211ccd5457e6c237cabcad14d4f3900"
        ),
        undefined
      )
    ];

    const mockTransaction = new Transaction(
      BigInt(0),
      cellDeps,
      [],
      inputs,
      outputs,
      ["0x", "0x"],
      []
    );

    return {
      transaction: mockTransaction,
      status: "committed",
      blockNumber: BigInt(0),
    };
  }

  async findCellsPaged(key: ClientIndexerSearchKeyLike, order: "asc" | "desc" = "asc", limit: Num = BigInt(10), after?: string): Promise<ClientFindCellsResponse> {
    return {cells: [], lastCursor: after || ""};
  }

  async getCellsCapacity(key: ClientIndexerSearchKeyLike): Promise<Num> {
    return BigInt(6200000000);
  }
}
