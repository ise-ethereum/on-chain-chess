import { tokenRecipient, MyToken, web3 } from '../contract/MyToken.sol';

window.onload = () => {
  renderWeb3Details();
  renderTokenDetails();
};

function renderWeb3Details() {
  document.getElementById('provider').innerHTML = web3.currentProvider.host;
  document.getElementById('latest-block').innerHTML = web3.eth.blockNumber;

  const accounts = web3.eth.accounts;
  let html = '';
  for (let account of web3.eth.accounts) {
    html += `${account}<br>\n`;
  }
  document.getElementById('list-accounts').innerHTML = html;
}

function renderTokenDetails() {
  document.getElementById('token-name').innerHTML = MyToken.name();
  document.getElementById('token-symbol').innerHTML = MyToken.symbol();
  document.getElementById('total-supply').innerHTML = MyToken.totalSupply();
  document.getElementById('version').innerHTML = MyToken.version();
}

console.log('Hello World!');
console.log(web3);
console.log(MyToken);
console.log(tokenRecipient);
