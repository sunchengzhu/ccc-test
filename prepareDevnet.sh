#!/bin/bash

killoffckb() {
  PIDS=$(lsof -ti:8114)
  for i in $PIDS; do
    echo "killed the offckb $i"
    kill $i
  done
}

if offckb --version 2>&1 | grep -q "command not found"; then
  echo "offckb not found, installing..."
  npm install -g @offckb/cli
else
  echo "offckb is installed"
fi

killoffckb
offckb clean

nohup offckb node >offckb.log 2>&1 &
sleep 5
offckb transfer ckt1qzwxjv7ewumq7y2686wdtghqu36c2d5phqxhwhvn458cj6w6xsl9vqgyvjvarw3yz8xmhcrt54qkaafry5r072pgqqtlx7ud 100000000000 --privkey 0x6109170b275a09ad54877b82f7d9930f88cab5717d484fb4741ae9d1dd078cd6 --network devnet

for i in {1..20}; do
  result=$(offckb balance ckt1qzwxjv7ewumq7y2686wdtghqu36c2d5phqxhwhvn458cj6w6xsl9vqgyvjvarw3yz8xmhcrt54qkaafry5r072pgqqtlx7ud --network devnet)
  if [[ "$result" == "Balance: 1000 CKB" ]]; then
    echo "Attempt $i: $result"
    exit 0
  fi
  sleep 1
done
echo "transfer failed: $result"
