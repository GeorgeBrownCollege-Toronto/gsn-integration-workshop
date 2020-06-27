const ethers = require('ethers')
const ProxyRelayProvider = require('@opengsn/paymasters/dist/src/ProxyRelayProvider').default
const relayHubAddress = require('../build/gsn/RelayHub.json').address
const stakeManagerAddress = require('../build/gsn/StakeManager.json').address
const forwarderAddress = require('../build/gsn/Forwarder.json').address

const proxyFactoryArtifact = require('../build/contracts/ProxyFactory.json')
const proxyFactoryAddress = proxyFactoryArtifact.networks[window.ethereum.networkVersion].address

const relayHubArtifact = require('../build/contracts/IRelayHub.json')

const testUniswapArtifact = require('../build/contracts/TestUniswap.json')
const testUniswapAddress = testUniswapArtifact.networks[window.ethereum.networkVersion].address

const testTokenArtifact = require('../build/contracts/TestToken.json')

const contractArtifact = require('../build/contracts/CaptureTheFlag.json')
const contractAddress = contractArtifact.networks[window.ethereum.networkVersion].address
const contractAbi = contractArtifact.abi

const paymasterArtifact = require('../build/contracts/ProxyDeployingPaymaster.json')
const proxyDeployingPaymasterAddress = paymasterArtifact.networks[window.ethereum.networkVersion].address

let provider
let underlyingProvider
let gsnProvider
let network

async function identifyNetwork () {
  underlyingProvider = new ethers.providers.Web3Provider(window.ethereum)
  network = await underlyingProvider.ready
  const gsnConfig = {
    verbose: true,
    relayHubAddress,
    paymasterAddress: proxyDeployingPaymasterAddress,
    forwarderAddress,
    stakeManagerAddress,
    methodSuffix: '_v4',
    jsonStringifyRequest: true,
    // TODO: this is actually a reported bug in MetaMask. Should be:
    // chainId: network.chainId
    // but chainID == networkId on top ethereum networks. See https://chainid.network/
    chainId: window.ethereum.networkVersion
  }
  gsnProvider = new ProxyRelayProvider(proxyFactoryAddress, window.ethereum, gsnConfig)
  provider = new ethers.providers.Web3Provider(gsnProvider)
  return network
}

async function contractCall () {
  await window.ethereum.enable()

  const contract = new ethers.Contract(
    contractAddress, contractAbi, provider.getSigner())
  const transaction = await contract.captureTheFlag()
  const hash = transaction.hash
  console.log(`Transaction ${hash} sent`)
  const receipt = await provider.waitForTransaction(hash)
  console.log(`Mined in block: ${receipt.blockNumber}`)
}

let logview

function log (message) {
  message = message.replace(/(0x\w\w\w\w)\w*(\w\w\w\w)\b/g, '<b>$1...$2</b>')
  if (!logview) {
    logview = document.getElementById('logview')
  }
  logview.innerHTML = message + '<br>\n' + logview.innerHTML
}

async function listenToEvents () {
  const contract = new ethers.Contract(
    contractAddress, contractAbi, provider)

  contract.on('FlagCaptured', (previousHolder, currentHolder, rawEvent) => {
    log(`Flag Captured from&nbsp;${previousHolder} by&nbsp;${currentHolder}`)
    console.log(`Flag Captured from ${previousHolder} by ${currentHolder}`)
  })
}

async function getAddresses () {
  const ownerAddress = await provider.getSigner().getAddress()
  const proxyAddress = await getProxyAddressOnChain()
  return {
    ownerAddress,
    proxyAddress
  }
}

async function depositForPaymaster () {
  const contract = new ethers.Contract(
    relayHubAddress, relayHubArtifact.abi, underlyingProvider.getSigner())
  return contract.depositFor(proxyDeployingPaymasterAddress, {
    value: '0x' + 1e18.toString(16)
  })
}

async function getPaymasterBalance () {
  const contract = new ethers.Contract(
    relayHubAddress, relayHubArtifact.abi, provider.getSigner())
  return contract.balanceOf(proxyDeployingPaymasterAddress)
}

async function getTokenAddress () {
  const uniswap = new ethers.Contract(
    testUniswapAddress, testUniswapArtifact.abi, provider.getSigner())
  return await uniswap.tokenAddress()
}

async function getTokenBalance (address) {
  const testTokenAddress = await getTokenAddress()
  const contract = new ethers.Contract(
    testTokenAddress, testTokenArtifact.abi, provider.getSigner())
  return contract.balanceOf(address)
}

async function transferTokensToProxy () {
  const testTokenAddress = await getTokenAddress()
  const contract = new ethers.Contract(
    testTokenAddress, testTokenArtifact.abi, underlyingProvider.getSigner())
  const { ownerAddress, proxyAddress } = await getAddresses()
  const balance = await getTokenBalance(ownerAddress)
  return contract.transfer(proxyAddress, balance)
}

async function getProxyAddressOnChain () {
  let signer = underlyingProvider.getSigner()
  const contract = new ethers.Contract(
    proxyFactoryAddress, proxyFactoryArtifact.abi, signer)
  const proxy = await contract.calculateAddress(signer.getAddress())
  console.log(proxy)
  return proxy
}

window.app = {
  depositForPaymaster,
  getPaymasterBalance,
  getTokenBalance,
  transferTokensToProxy,
  getProxyAddressOnChain,
  getAddresses,
  contractCall,
  listenToEvents,
  identifyNetwork
}
