# ccc-test

本工程是一个ccc的测试Demo，主要用从offckb devnet得到的mock数据去测试ccc core包里面signerBtc类的[prepareTransaction](https://github.com/ckb-ecofund/ccc/blob/3a9b7d728efb6dcfaecf18c3f01fcc80081a60fb/packages/core/src/signer/btc/signerBtc.ts#L81-L86)能否能返回一个可用的tx结构。

## mock数据准备

从下面的步骤可以获取确定且唯一的tx

1. 给测试地址充值1000CKB

    ```bash
    offckb clean
    offckb node
    offckb transfer ckt1qzwxjv7ewumq7y2686wdtghqu36c2d5phqxhwhvn458cj6w6xsl9vqgyalwlmdxd2ggue4290ekzxl9tetg56neeqqhvg0sd 100000000000 --privkey 0x6109170b275a09ad54877b82f7d9930f88cab5717d484fb4741ae9d1dd078cd6 --network devnet
    # 不断查询余额，直到看到"Balance: 1000 CKB"
    offckb balance ckt1qzwxjv7ewumq7y2686wdtghqu36c2d5phqxhwhvn458cj6w6xsl9vqgyalwlmdxd2ggue4290ekzxl9tetg56neeqqhvg0sd --network devnet
    ```

2. 从测试地址转出200CKB

   可以参考[quick-start](https://docs.nervos.org/docs/getting-started/quick-start)从前端界面唤起okx wallet选择BTC网络转账，导入okx wallet的助记词为`abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`。
   
   给`ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0kegwq3fq2k0gqug5ejvx0p7xznzs6jrg890q3w`转账200CKB
   
   ![image-20240715145533457](https://typora-1304641378.cos.ap-shanghai.myqcloud.com/images/image-20240715145533457.png)

3. 查询这笔交易

   ```bash
   cd YOUR_CKB_CLI_PATH
   export API_URL=http://127.0.0.1:8114
   ./ckb-cli rpc get_transaction --hash 0xfbd6828a10b3d88401ed2d6f80ca13995e5783b5b3b2b14b151dea2163f378b8
   ```

   ```yaml
   cycles: 1467591
   transaction:
     cell_deps:
       - dep_type: code
         out_point:
           index: 7
           tx_hash: 0x1dbed8dcfe0f18359c65c5e9546fd15cd69de73ea0a502345be30180649c9467
       - dep_type: dep_group
         out_point:
           index: 0
           tx_hash: 0x75be96e1871693f030db27ddae47890a28ab180e88e36ebb3575d9f1377d3da7
     hash: 0xfbd6828a10b3d88401ed2d6f80ca13995e5783b5b3b2b14b151dea2163f378b8
     header_deps: []
     inputs:
       - previous_output:
           index: 0
           tx_hash: 0x29643a7b597e17578be682e5c6dbd223ad7fe6c9693bc8d7efad250f9fbf4f40
         since: 0x0 (absolute block(0))
     outputs:
       - capacity: "200.0"
         lock:
           args: 0xf6ca1c08a40ab3d00e2299930cf0f8c298a1a90d
           code_hash: 0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8 (sighash)
           hash_type: type
         type: ~
       - capacity: "799.99999215"
         lock:
           args: 0x04efddfdb4cd5211ccd5457e6c237cabcad14d4f3900
           code_hash: 0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56
           hash_type: type
         type: ~
     outputs_data:
       - 0x
       - 0x
     version: 0
     witnesses:
       - 0x690000001000000069000000690000005500000055000000100000005500000055000000410000001f09771f0a0e8320f112b7fb774a52c17862fb80ea941745d99ff52982ae0e6a4507351e60c71388fbf86ea98acbba46c3cdbf92baccecdcfedda03f5ef95d50f
   tx_status:
     block_hash: 0x88158e8599643945ee77e1a131f18d7d56ee9b5cbc97863ca712c14f5085835b
     block_number: ~
     reason: ~
     status: committed
   ```

   
