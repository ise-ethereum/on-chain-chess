#!/bin/sh
NODE_ADDR=${NODE_ADDR:-'http://localhost:8545'}
if [ "$1" = "mine" ]; then
  COUNT=${2:-'1'}
  seq ${COUNT} | parallel -n0 -j1000 "curl ${NODE_ADDR} --data-binary '{\"jsonrpc\": \"2.0\", \"method\": \"evm_mine\"}'"
elif [ "$1" = "height" ]; then
  curl "${NODE_ADDR}"  --data-binary '{"jsonrpc": "2.0", "method": "eth_blockNumber"}'
elif [ "$1" = "stop" ]; then
  curl "${NODE_ADDR}"  --data-binary '{"jsnorpc": "2.0", "method": "miner_stop"}'
elif [ "$1" = "start" ]; then
  curl "${NODE_ADDR}"  --data-binary '{"jsnorpc": "2.0", "method": "miner_start"}'
else
  echo "usage: ethcli mine [number] | height | start | stop"
  exit 1
fi