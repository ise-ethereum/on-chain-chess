node {
    stage 'Checkout'
    git url: 'https://github.com/ise-ethereum/on-chain-chess'

    stage 'Build'
    sh "npm install"

    stage 'Unit-Tests'
    sh "npm run test-testrpc"
}
