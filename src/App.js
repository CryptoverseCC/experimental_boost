import React, { Component } from 'react';
import qs from 'qs';
import Web3 from 'web3';
import core from '@userfeeds/core';

import './App.css';

const web3 = new Web3();

if (document.readyState === 'complete' && window.web3) {
  web3.setProvider(window.web3.currentProvider);
} else {
  window.addEventListener('load', () => {
    if (window.web3) {
      web3.setProvider(window.web3.currentProvider);
    }
  });
}

class App extends Component {
  state = {
    network: 'ethereum',
    appId: '',
    value: '',
    tokenAddress: '',
    recipientAddress: '',
    items: [],
    loading: false,
  };

  render() {
    const { appId, recipientAddress, network, tokenAddress, value, loading, items } = this.state;
    return (
      <div className="App">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div>
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipientAddress}
              onChange={(e) => this.setState({ recipientAddress: e.target.value }, this.fetch)}
            />
            <button onClick={this.copyAddress}>Copy from MM</button>
          </div>
          <select
            type="text"
            placeholder="network"
            value={network}
            onChange={(e) => this.setState({ network: e.target.value }, this.fetch)}
          >
            <option value="ethereum">Mainnet</option>
            <option value="kovan">Kovan</option>
            <option value="ropsten">Ropsten</option>
            <option value="rinkeby">Rinkeby</option>
          </select>
          <div>
            <input
              type="text"
              placeholder="ERC20 Token address"
              value={tokenAddress}
              onChange={(e) => this.setState({ tokenAddress: e.target.value }, this.fetch)}
            />
            {tokenAddress && (
              <span style={{ color: 'red', fontSize: '0.8em', fontWeight: 'bold' }}>
                This example works only with tokens with 18 decimals
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: 'solid 1px black', margin: '10px' }}>
          <div style={{ flex: 1 }}>
            <p>
              <b>Input</b>
            </p>
            <input
              type="text"
              placeholder="App identifier"
              value={appId}
              onChange={(e) => this.setState({ appId: e.target.value })}
            />
            <input
              type="text"
              placeholder="Amount"
              value={value}
              onChange={(e) => this.setState({ value: e.target.value })}
            />
            <button onClick={this.send}>Send</button>
          </div>
          <div style={{ flex: 1, borderLeft: 'solid 1px black' }}>
            <p>
              <b>API result</b>
            </p>
            <pre style={{ textAlign: 'left' }}>{items}</pre>
            {loading && <span style={{ color: 'grey' }}>Loading...</span>}
          </div>
        </div>
      </div>
    );
  }

  send = async () => {
    if (!(await this.isOnCorrentNetwork())) {
      alert(`Switch to ${this.state.network} in MetaMask`);
      return;
    }
    this.state.tokenAddress ? this.sendClaimWithToken() : this.sendClaimWithEth();
  };

  sendClaimWithToken = async () => {
    const { value, tokenAddress, recipientAddress } = this.state;
    const claim = this.getClaim();

    const valueInTokenWei = web3.utils.toWei(value);
    await core.ethereum.claims.approveUserfeedsContractTokenTransfer(web3, tokenAddress, valueInTokenWei);

    core.ethereum.claims
      .sendClaimTokenTransfer(web3, recipientAddress, tokenAddress, value, claim)
      .then(({ promiEvent }) => {
        promiEvent.on('transactionHash', (txHash) => {
          alert(`Confirmed in MM txHash=${txHash}`);
        });
        return promiEvent;
      })
      .then((receipt) => {
        console.log('Transaction mined', receipt);
      })
      .catch((e) => console.error(e));
  };

  sendClaimWithEth = async () => {
    const { value, recipientAddress } = this.state;
    const claim = this.getClaim();

    core.ethereum.claims
      .sendClaimValueTransfer(web3, recipientAddress, value, claim)
      .then(({ promiEvent }) => {
        promiEvent.on('transactionHash', (txHash) => {
          alert(`Confirmed in MM txHash=${txHash}`);
        });
        return promiEvent;
      })
      .then((receipt) => {
        console.log('Transaction mined', receipt);
      })
      .catch((e) => console.error(e));
  };

  getClaim = () => ({
    claim: {
      target: this.state.appId,
    },
    credits: [
      {
        type: 'interface',
        value: window.location.href,
      },
    ],
  });

  copyAddress = async () => {
    const [address] = await web3.eth.getAccounts();
    if (address) {
      this.setState({ recipientAddress: address }, this.fetch);
    }
  };

  isOnCorrentNetwork = async () => this.state.network === (await core.utils.getCurrentNetworkName(web3));

  fetch = async () => {
    this.setState({ loading: true });
    const { recipientAddress, tokenAddress, network } = this.state;
    const asset = tokenAddress ? `${network}:${tokenAddress}` : network;

    const { items } = await fetch(
      `https://api-staging.userfeeds.io/ranking/experimental_boost;asset=${asset};context=${recipientAddress.toLowerCase()}`,
    ).then((res) => res.json());

    this.setState({ loading: false, items: JSON.stringify(items, null, 2) });
  };
}

export default App;
