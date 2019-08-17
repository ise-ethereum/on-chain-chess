#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 10 accounts with enougth balance, needed for high-value tests.

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    touch allFiredEvents
    node_modules/.bin/testrpc-sc --gasLimit 0x1fffffffffffff --port "$ganache_port" "${accounts[@]}" -i 1564754684494 --accounts 10 --defaultBalanceEther 100000000000000000 > /dev/null &
  else
    node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" -i 1564754684494 --accounts 10 --defaultBalanceEther 100000000000000000 > /dev/null &
  fi

  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance in PORT $ganache_port"
else
  echo "Starting our own ganache instance in PORT $ganache_port"
  start_ganache
fi

ganache-cli --version
truffle version

if [ "$SOLIDITY_COVERAGE" = true ]; then
  node_modules/.bin/solidity-coverage
else
  node_modules/.bin/truffle test "$@"
fi
