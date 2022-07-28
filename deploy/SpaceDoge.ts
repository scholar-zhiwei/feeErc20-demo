import { parseUnits } from 'ethers/lib/utils'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({ deployments, getNamedAccounts }: HardhatRuntimeEnvironment) {
  console.log('Running SpaceDoge deploy script')
  const { deploy } = deployments

  const { deployer, router } = await getNamedAccounts()
  console.log('Deployer:', deployer)
  console.log('router:', router)

  const totalSupply = parseUnits('100000000')

  const { address } = await deploy('SpaceDoge', {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    skipIfAlreadyDeployed: false,
    // waitConfirmations: 3,
    args: [router, totalSupply],
  })

  console.log('SpaceDoge deployed at ', address)
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['SpaceDoge']
