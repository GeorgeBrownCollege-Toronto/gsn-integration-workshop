const CaptureTheFlag = artifacts.require('CaptureTheFlag')
const TestUniswap = artifacts.require('TestUniswap')
const TestToken = artifacts.require('TestToken')
const ProxyFactory = artifacts.require('ProxyFactory')
const ProxyDeployingPaymaster = artifacts.require('ProxyDeployingPaymaster')

module.exports = async function (deployer, network) {
  await deployer.deploy(CaptureTheFlag)

  const instance = await CaptureTheFlag.deployed()
  const forwarderAddress = require('../build/gsn/Forwarder.json').address
  await instance.setTrustedForwarder(forwarderAddress)
  console.log(`Successfully set Trusted Forwarder (${forwarderAddress}) on Recipient (${instance.address})`)

  if ('development' === network) {
    const relayHubAddress = require('../build/gsn/RelayHub.json').address
    await deployer.deploy(ProxyFactory)
    await deployer.deploy(TestUniswap, 2, 1, {
      value: 1e18
    })
    const uniswap = await TestUniswap.deployed()
    const tokenAddress = await uniswap.tokenAddress()
    await deployer.deploy(ProxyDeployingPaymaster, [uniswap.address], ProxyFactory.address)
    const paymaster = await ProxyDeployingPaymaster.deployed()
    await paymaster.setRelayHub(relayHubAddress)
    await paymaster.setTrustedForwarder(forwarderAddress)

    console.log(`ProxyFactory(${ProxyFactory.address}) deployed`)
    console.log(`TestUniswap(${uniswap.address}) deploys TestToken(${tokenAddress})`)
    console.log(`RelayHub(${relayHubAddress}) set on Paymaster(${ProxyDeployingPaymaster.address})`)
    console.log(`Forwarder(${forwarderAddress}) set on Paymaster(${ProxyDeployingPaymaster.address})`)
/*
    const ethers = require('ethers')
    const { networks } = require('../truffle.js')
    const { host, port } = (networks[network] || {})
    const ethersProvider = new ethers.providers.JsonRpcProvider(`http://${host}:${port}`)
    await ethersProvider.getSigner(0).sendTransaction({
      to: WhitelistPaymaster.address,
      value: ethers.utils.parseEther("1.0")
    })
    console.log(`1 ETH deposited to Paymaster(${WhitelistPaymaster.address})`)
*/

    const token = await TestToken.at(tokenAddress)
    await token.mint(1e20.toString())
  }
}
