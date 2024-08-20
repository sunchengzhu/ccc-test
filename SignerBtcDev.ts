import { Client, HexLike, SignerBtc } from "@ckb-ccc/core";
import { BytesLike, hexFrom } from "@ckb-ccc/ccc";

const port = 3000;

export class SignerBtcDev extends SignerBtc {
  constructor(client: Client) {
    super(client);
  }

  async fetchFromConnect() {
    const response = await fetch(`http://localhost:${port}/connect`, {method: 'POST'});
    const data = await response.json();
    if (!response.ok) {
      throw new Error('Failed to connect to Bitcoin testnet');
    }
    return data.result;
  }

  async getBtcPublicKey(): Promise<HexLike> {
    // 可以在浏览器上执行这个命令得到公钥：await window.okxwallet.bitcoinTestnet.connect()
    const result = await this.fetchFromConnect();
    return result.compressedPublicKey;
  }

  async getBtcAccount(): Promise<string> {
    // 返回当前的 Bitcoin 账户地址
    const result = await this.fetchFromConnect();
    return result.address;
  }

  async signMessageRaw(message: string | BytesLike): Promise<string> {
    const challenge =
      typeof message === "string" ? message : hexFrom(message).slice(2);

    const response = await fetch(`http://localhost:${port}/signMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({signStr: challenge})
    });

    const data = await response.json();
    return data.result;
  }

  // 没什么用 但是不加这个方法编译会报错
  async connect(): Promise<void> {
    console.log("Connected to Bitcoin service");
  }

  // 没什么用 但是不加这个方法编译会报错
  async isConnected(): Promise<boolean> {
    return true;
  }
}
