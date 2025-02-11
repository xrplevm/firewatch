import { IEthersProvider } from "./interfaces/i-ethers.provider";
import { ethers } from "ethers";
import { AxelarAmplifierGateway, ERC20, InterchainTokenService } from "@shared/evm/contracts";
import BigNumber from "bignumber.js";
import { Token } from "@firewatch/core/token";

export class EthersProvider implements IEthersProvider {
    constructor(readonly ethersProvider: ethers.Provider) {}

    /**
     * @inheritdoc
     */
    getERC20Contract(address: string, signerOrProvider: ethers.Signer | ethers.Provider = this.ethersProvider): ERC20 {
        return new ERC20(address, signerOrProvider);
    }

    /**
     * @inheritdoc
     */
    getInterchainTokenServiceContract(
        address: string,
        signerOrProvider: ethers.Signer | ethers.Provider = this.ethersProvider,
    ): InterchainTokenService {
        return new InterchainTokenService(address, signerOrProvider);
    }

    /**
     * @inheritdoc
     */
    getAxelarAmplifierGatewayContract(
        address: string,
        signerOrProvider: ethers.Signer | ethers.Provider = this.ethersProvider,
    ): AxelarAmplifierGateway {
        return new AxelarAmplifierGateway(address, signerOrProvider);
    }

    /**
     */
    async getNativeBalance(address: string): Promise<string> {
        const balance = await this.ethersProvider.getBalance(address);
        return balance.toString();
    }

    /**
     * Gets the nonce.
     * @param address The address of the account.
     * @returns The nonce.
     */
    async getNonce(address: string): Promise<number> {
        return this.ethersProvider.getTransactionCount(address);
    }

    /**
     * Checks if an account is active.
     * @param address The address of the account.
     * @returns True if the account is active, false otherwise.
     */
    async isAccountActive(address: string): Promise<boolean> {
        const [balance, nonce] = await Promise.all([this.getNativeBalance(address), this.getNonce(address)]);
        return !(BigNumber(balance).eq(0) && nonce === 0);
    }

    /**
     * Gets the ERC20 balance.
     * @param address The address of the account.
     * @param tokenAddress The address of the token.
     * @returns The balance.
     */
    async getERC20Balance(address: string, tokenAddress: string): Promise<string> {
        const tokenContract = this.getERC20Contract(tokenAddress);
        const balance = await tokenContract.balanceOf(address);
        return balance.toString();
    }

    /**
     * @inheritdoc
     */
    async getTokenBalance(address: string, token: Token): Promise<string> {
        if (token.isNative()) return this.getNativeBalance(address);
        else return this.getERC20Balance(address, token.address!);
    }

    /**
     * @inheritdoc
     */
    async isERC20Approved(token: string, owner: string, spender: string): Promise<boolean> {
        const tokenContract = this.getERC20Contract(token);
        const approved = await tokenContract.allowance(owner, spender);
        return BigNumber(approved.toString()).gt(0);
    }
}
