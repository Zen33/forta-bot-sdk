import { BigNumber, ethers, providers, Wallet } from "ethers"
import AgentRegistryAbi from "./agent.registry.abi.json"

const GAS_MULTIPLIER = 1.15
const GAS_PRICE_MULTIPLIER = 1.5
const FALLBACK_CREATE_AGENT_GAS_LIMIT = BigNumber.from(350_000)
const FALLBACK_UPDATE_AGENT_GAS_LIMIT = BigNumber.from(95_000)
const FALLBACK_ENABLE_AGENT_GAS_LIMIT = BigNumber.from(55_000)
const FALLBACK_DISABLE_AGENT_GAS_LIMIT = BigNumber.from(70_000)

type AgentDescription = {
  created: boolean;
  owner: string;
  metadata: string;
}

export default class AgentRegistry {

  constructor(
    private ethersAgentRegistryProvider: providers.JsonRpcProvider,
    private agentRegistryContractAddress: string
  ) {}

  async getAgent(agentId: string): Promise<AgentDescription> {
    return this.getContract().getAgent(agentId)
  }

  async agentExists(agentId: string) {
    const agent = await this.getAgent(agentId)
    return agent.created
  }
  
  async createAgent(fromWallet: Wallet, agentId: string, reference: string, chainIds: number[]) {
    const from = fromWallet.address
    const contract = this.getContract(fromWallet)
    let gas = FALLBACK_CREATE_AGENT_GAS_LIMIT;
    try { gas = await contract.estimateGas.createAgent(agentId, from, reference, chainIds)}
    catch (e) { console.log(`unable to estimate gas for createAgent, using fallback gas limit (${gas})`) }
    const txOptions = await this.getTxOptions(gas, fromWallet)
    const tx = await contract.createAgent(agentId, from, reference, chainIds, txOptions)
    await tx.wait()
    return tx.hash
  }

  async updateAgent(fromWallet: Wallet, agentId: string, reference: string, chainIds: number[]) {
    const contract = this.getContract(fromWallet)
    let gas = FALLBACK_UPDATE_AGENT_GAS_LIMIT
    try { gas = await contract.estimateGas.updateAgent(agentId, reference, chainIds) }
    catch(e) { console.log(`unable to estimate gas for updateAgent, using fallback gas limit (${gas})`) }
    const txOptions = await this.getTxOptions(gas, fromWallet)
    const tx = await contract.updateAgent(agentId, reference, chainIds, txOptions)
    await tx.wait()
    return tx.hash
  }

  async isEnabled(agentId: string) {
    return this.getContract().isEnabled(agentId)
  }

  async disableAgent(fromWallet: Wallet, agentId: string) {
    const contract = this.getContract(fromWallet)
    let gas = FALLBACK_DISABLE_AGENT_GAS_LIMIT
    try { gas = await contract.estimateGas.disableAgent(agentId, 1)/* Permission.OWNER = 1 */ }
    catch(e) { console.log(`unable to estimate gas for disableAgent, using fallback gas limit (${gas})`) }
    const txOptions = await this.getTxOptions(gas, fromWallet)
    const tx = await contract.disableAgent(agentId, 1, txOptions)
    await tx.wait()
    return tx.hash
  }

  async enableAgent(fromWallet: Wallet, agentId: string) {
    const contract = this.getContract(fromWallet)
    let gas = FALLBACK_ENABLE_AGENT_GAS_LIMIT
    try { gas = await contract.estimateGas.enableAgent(agentId, 1)/* Permission.OWNER = 1 */ }
    catch(e) { console.log(`unable to estimate gas for enableAgent, using fallback gas limit (${gas})`) }
    const txOptions = await this.getTxOptions(gas, fromWallet)
    const tx = await contract.enableAgent(agentId, 1, txOptions)
    await tx.wait()
    return tx.hash
  }

  private getContract(fromWallet?: Wallet) {
    return new ethers.Contract(
      this.agentRegistryContractAddress,
      AgentRegistryAbi,
      fromWallet ? fromWallet.connect(this.ethersAgentRegistryProvider) : this.ethersAgentRegistryProvider
    )
  }

  private async getTxOptions(gasLimit: ethers.BigNumber, fromWallet: Wallet) {
    const gasPrice = await fromWallet.connect(this.ethersAgentRegistryProvider).getGasPrice()
    return {
      gasLimit: Math.round(gasLimit.toNumber() * GAS_MULTIPLIER),
      gasPrice: Math.round(gasPrice.toNumber() * GAS_PRICE_MULTIPLIER)
    }
  }
}