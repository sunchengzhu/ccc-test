import { Client, HexLike, SignerBtc } from "@ckb-ccc/core";
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from "ecpair";


export class SignerBtcSimple extends SignerBtc {
  constructor(client: Client) {
    super(client);
  }

  async getBtcPublicKey(): Promise<HexLike> {
    const ECPair = ECPairFactory(ecc);
    // WIF格式私钥，把下面的助记词导入到okx再导出的私钥
    // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    const wif = "KyRv5iFPHG7iB5E4CqvMzH3WFJVhbfYK4VY7XAedd9Ys69mEsPLQ";
    const keyPair = ECPair.fromWIF(wif, bitcoin.networks.bitcoin);
    return keyPair.publicKey;
  }

  async connect(): Promise<void> {
    console.log("Connected to Bitcoin service");
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  async getBtcAccount(): Promise<string> {
    return "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr";
  }
}
