import { parseUnits } from 'ethers/lib/utils'
import { task } from 'hardhat/config'
import { NomicLabsHardhatPluginError } from 'hardhat/plugins'

task('verify:all', 'Verify all contracts', async (_, { ethers, run, getNamedAccounts }) => {
  const totalSupply = parseUnits('100000000')
  const { router } = await getNamedAccounts()
  const token = await ethers.getContract('SpaceDoge')
  const contracts: {
    name: string
    address: string
    constructorArguments?: string[]
  }[] = [
    {
      name: 'SpaceDoge',
      address: token.address,
      constructorArguments: [router, totalSupply.toString()],
    },
  ]

  for (const { address, constructorArguments } of contracts) {
    try {
      await run('verify:verify', {
        address,
        constructorArguments,
      })
    } catch (error) {
      if (error instanceof NomicLabsHardhatPluginError) {
        console.debug(error.message)
      }
    }
  }
})
