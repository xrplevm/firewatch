import { ethers } from "ethers";
import { Web3SignerErrors } from "./web3.signer.errors";
import { SignerError } from "../../../core/error";
import { SubProvider } from "../../../../providers/evm/ethers/ethers.provider.types";
import { Web3Chain } from "./web3.signer.types";
import { IWeb3Signer } from "./interfaces/i-web3.signer";
import { EthersSigner } from "../ethers.signer";
import { IEthersSignerProvider } from "../interfaces";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { Chain } from "@firewatch/core/chain";
import { Token } from "@firewatch/core/token";

export class Web3Signer<Provider extends IEthersSignerProvider = IEthersSignerProvider>
    extends EthersSigner<Provider>
    implements IWeb3Signer
{
    protected _chain: Web3Chain | undefined;
    protected get chain(): Web3Chain {
        if (!this._chain) throw new SignerError(Web3SignerErrors.WEB3_CHAIN_NOT_SET);
        return this._chain;
    }
    protected set chain(chain: Web3Chain) {
        this._chain = chain;
    }

    protected get web3Provider(): ethers.providers.Web3Provider {
        return this.signer.provider as ethers.providers.Web3Provider;
    }

    protected get web3SubProvider(): SubProvider {
        return this.web3Provider.provider as SubProvider;
    }

    constructor(signer: ethers.Signer, provider: Provider) {
        if (!signer.provider || !(signer.provider instanceof ethers.providers.Web3Provider)) {
            throw new SignerError(Web3SignerErrors.SIGNER_PROVIDER_MUST_BE_WEB3);
        }

        super(signer, provider);
    }

    /**
     * Handles service errors.
     * @param e Error.
     * @param handlers Error handlers.
     */
    private handleError(e: any, handlers?: Partial<Record<number | "default", Web3SignerErrors | (() => void)>>): any {
        if (handlers?.[e.code]) {
            const handler = handlers[e.code];
            if (typeof handler === "function") handler();
            else throw new SignerError(handler!);
        } else if (e.code === 4001 || e.code === "ACTION_REJECTED") throw new SignerError(Web3SignerErrors.WEB3_REQUEST_REJECTED);
        else if (e.code === -32002) throw new SignerError(Web3SignerErrors.WEB3_PENDING_REQUESTS_RESOLUTION_REQUIRED);
        else if (handlers?.["default"]) {
            const handler = handlers["default"];
            if (typeof handler === "function") handler();
            else throw new SignerError(handler!);
        } else throw e;
    }

    /**
     * @inheritdoc
     */
    onAccountsChange(handler: (address: string[]) => void): () => void {
        this.web3SubProvider.on("accountsChanged", handler);
        return () => this.web3SubProvider.removeListener("accountsChanged", handler);
    }

    /**
     * @inheritdoc
     */
    onChainChange(handler: (chainId: string) => void): () => void {
        this.web3SubProvider.on("chainChanged", handler);
        return () => this.web3SubProvider.removeListener("chainChanged", handler);
    }

    /**
     * @inheritdoc
     */
    protected async getProviderChainId(): Promise<string> {
        const network = await this.web3Provider.getNetwork();
        return "0x" + network.chainId.toString(16);
    }

    /**
     * @inheritdoc
     */
    setChain(chain: Chain): void {
        this.chain = {
            chainId: "0x" + chain.chainId?.toString(16),
            chainName: chain.name,
            rpcUrls: [chain.urls.rpc!],
            blockExplorerUrls: [chain.explorer.url],
            nativeCurrency: {
                symbol: chain.nativeToken.symbol,
                decimals: chain.nativeToken.decimals,
            },
        };
    }

    /**
     * @inheritdoc
     */
    async setChainAndConnect(chain: Chain): Promise<void> {
        this.setChain(chain);
        await this.handleProviderChainConnection();
    }

    /**
     * Adds the chain to the provider.
     * @returns A promise that resolves when the chain is added.
     */
    async addChain(): Promise<void> {
        try {
            return await this.web3SubProvider.request({
                method: "wallet_addEthereumChain",
                params: [this.chain],
            });
        } catch (e) {
            return this.handleError(e);
        }
    }

    /**
     * Switches to the chain. If the chain is not found, it adds it.
     * @returns A promise that resolves when the chain is switched.
     */
    async switchToChain(): Promise<void> {
        try {
            await this.web3SubProvider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: this.chain.chainId }],
            });
        } catch (e: any) {
            // If the chain is not found, add it.
            if (e.code === 4902) await this.addChain();
            return this.handleError(e);
        }
    }

    /**
     * Handles the provider chain connection.
     * If the provider chain is not the same as the chain, it switches to the chain or adds it.
     */
    async handleProviderChainConnection(): Promise<void> {
        const providerChainId = await this.getProviderChainId();

        if (providerChainId !== this.chain.chainId) await this.switchToChain();
    }

    /**
     * @inheritdoc
     */
    async approveERC20(address: string, spender: string): Promise<Unconfirmed<Transaction>> {
        try {
            await this.handleProviderChainConnection();
            return await super.approveERC20(address, spender);
        } catch (e) {
            return this.handleError(e);
        }
    }

    /**
     * @inheritdoc
     */
    async transfer(
        amount: string,
        token: Token,
        doorAddress: string,
        destinationChain: Chain,
        destinationAddress: string,
    ): Promise<Unconfirmed<Transaction>> {
        try {
            await this.handleProviderChainConnection();
            return await super.transfer(amount, token, doorAddress, destinationChain, destinationAddress);
        } catch (e) {
            return this.handleError(e);
        }
    }
}
