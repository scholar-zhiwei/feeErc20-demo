import { expect } from 'chai'
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils'
import { AddressZero } from '@ethersproject/constants'
import { ethers, network } from 'hardhat'
import { TestERC20 } from '../typechain/contracts/Test/TestERC20'
import { randomHex } from './utils/encoding'
import { fixtureERC20 } from './utils/fixtures/tokens'
import { faucet } from './utils/impersonate'
import { mine, time, takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers'
import { SpaceDoge, IUniswapV2Router02 } from '../typechain'
import { abi } from '../artifacts/contracts/Test/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json'
import { BigNumber, Wallet } from 'ethers'

describe('Initial', async function () {
  let deployer: any
  let owner: any
  let from: any
  let to: any
  let caller: any
  let users: Wallet[] = []
  const { provider } = ethers
  after(async () => {
    console.log('reset')
    await network.provider.request({
      method: 'hardhat_reset',
    })
  })
  before('', async function () {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
            // blockNumber: 19849581,
          },
        },
      ],
    })
    owner = (await ethers.getSigners())[0]
    from = new ethers.Wallet(randomHex(32), provider)
    to = new ethers.Wallet(randomHex(32), provider)
    caller = new ethers.Wallet(randomHex(32), provider)

    await Promise.all([owner, from, to, caller].map((wallet) => faucet(wallet.address, provider)))
  })

  describe('Test Token', function () {
    let token: SpaceDoge
    let weth: SpaceDoge
    let pair: SpaceDoge
    let router: IUniswapV2Router02
    let tokenSnapshot: SnapshotRestorer
    let show_balance: () => any
    before('', async function () {
      console.log('owner.address', owner.address)
      const f = await ethers.getContractFactory('SpaceDoge', owner.address)
      const totalSupply = parseUnits('100000000')
      token = (await f.deploy('0xD99D1c33F9fC3444f8101754aBC46c52416550D1', totalSupply)) as SpaceDoge
      console.log('token address: ', token.address)
      console.log('token balance: ', formatUnits(await token.balanceOf(owner.address)))
      router = await ethers.getContractAt(abi, '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', owner)
      const WETH = await router.WETH()
      weth = await ethers.getContractAt('SpaceDoge', WETH, owner)
      pair = await ethers.getContractAt('SpaceDoge', await token.uniswapV2Pair(), owner)

      show_balance = async () => {
        const pair_balance = await token.balanceOf(pair.address)
        console.log('pair token balance:', formatUnits(pair_balance))

        const pair_weth_balance = await weth.balanceOf(pair.address)
        console.log('pair weth balance:', formatUnits(pair_weth_balance))

        const token_token_balance = await token.balanceOf(token.address)
        console.log('token token balance:', formatUnits(token_token_balance))

        let index = 0
        for await (const user of users) {
          const user_pair_balance = await pair.balanceOf(user.address)
          console.log(`user ${index} pair balance:`, formatUnits(user_pair_balance))
          const user_token_balance = await token.balanceOf(user.address)
          console.log(`user ${index} token balance:`, formatUnits(user_token_balance))
          index++
        }
        console.log('LP length', (await token.getlpsize()).toString())
        console.log('Total pair balance:', formatUnits(await pair.totalSupply()))
        console.log('----------------------------------------------------------------')
      }
    })
    // beforeEach(async () => {
    //   await tokenSnapshot.restore()
    // })
    it('Transfer Token To Users', async function () {
      for (let i = 0; i < 100; i++) {
        users.push(new ethers.Wallet(randomHex(32), provider))
      }
      for await (const user of users) {
        await token.transfer(user.address, parseUnits('10'))
      }
    })
    it('Add Liquid', async function () {
      faucet(users[0].address, provider)
      await token.excludeFromFees(users[0].address, true)
      await token.connect(users[0]).approve(router.address, parseUnits('100000000000'))
      await router
        .connect(users[0])
        .addLiquidityETH(token.address, parseUnits('10'), 0, 0, users[0].address, 1000000000000, {
          value: parseEther('10'),
        })
      for await (const user of users.slice(1, 100)) {
        faucet(user.address, provider)
        await token.connect(user).approve(router.address, parseUnits('100000000000'))
        await router.connect(user).addLiquidityETH(token.address, parseUnits('10'), 0, 0, user.address, 1000000000000, {
          value: parseEther('60'),
        })
      }
      await show_balance()
    })
    it('Transfer Pair', async function () {
      await token.connect(owner).transfer(users[1].address, parseUnits('12000'))
      await token.connect(users[1]).approve(router.address, parseUnits('100000000000'))
      const tx = async (user: Wallet, amount: string) => {
        let result
        result = await router
          .connect(user)
          .addLiquidityETH(token.address, parseUnits(amount), 0, 0, users[1].address, 1000000000000, {
            value: parseUnits('5000'),
          })
        result = await result.wait()
        console.log('Gas', result.gasUsed.toString())
      }
      await tx(users[1], '10')
      await show_balance()
      for (let i = 2; i < 51; i++) {
        await pair
          .connect(users[i])
          .transfer(users[51].address, await pair.balanceOf(users[i].address) /* .sub(parseUnits('0.01')) */)
      }
      await tx(users[1], '500')
      await show_balance()
      await tx(users[1], '10')
      await show_balance()
      await tx(users[1], '660')
      await tx(users[1], '10')
      await show_balance()
      await tx(users[1], '490')
      await tx(users[1], '10')
      await show_balance()
    })
  })
})
