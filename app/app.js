import { tokenRecipient, MyToken, web3 } from '../contract/MyToken.sol';

function renderWeb3Details() {
  document.getElementById('provider').innerHTML = web3.currentProvider.host;
  document.getElementById('latest-block').innerHTML = web3.eth.blockNumber;

  let html = '';
  for (let account of web3.eth.accounts) {
    var balance = MyToken.balanceOf(account);
    html += `${account} - ${balance}<br>\n`;
  }
  document.getElementById('list-accounts').innerHTML = html;
}

function renderTokenDetails() {
  document.getElementById('token-name').innerHTML = MyToken.name();
  document.getElementById('token-symbol').innerHTML = MyToken.symbol();
  document.getElementById('total-supply').innerHTML = MyToken.totalSupply();
  document.getElementById('version').innerHTML = MyToken.version();
}

window.onload = () => {
  renderWeb3Details();
  renderTokenDetails();
};

var transferForm = document.getElementById('transfer');
transferForm.addEventListener('submit', function(event) {
  event.preventDefault();
  console.log('transferring',
              transferForm.from.value,
              transferForm.to.value,
              transferForm.amount.value);

  MyToken.transfer(transferForm.to.value, transferForm.amount.value,
                  {from: transferForm.from.value, gas:100000});

  renderWeb3Details();
});

var event = MyToken.Transfer({});
event.watch(function(error, result){
  if (!error)
    console.log('Transfer event', result);
});

console.log('Hello World!');
console.log(web3);
console.log(MyToken);
console.log(tokenRecipient);
