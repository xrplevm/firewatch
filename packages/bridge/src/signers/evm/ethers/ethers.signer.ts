import { ethers } from "ethers";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { IEthersSignerProvider } from "./interfaces/i-ethers-signer.provider";
import { EthersProvider } from "../../../providers/evm/ethers/ethers.provider";
import { SignerError } from "../../core/error";
import { EthersSignerErrors } from "./ethers.signer.errors";
import { EthersTransactionParser } from "../../../transaction-parsers/evm/ethers/ethers.transaction-parser";
import { AxelarAmplifierGateway, AxelarGasService, ERC20, InterchainTokenService } from "@shared/evm/contracts";
import { IEthersSigner } from "./interfaces";
import { Token } from "@firewatch/core/token";
import { EthersTransaction } from "./ethers.types";

export class EthersSigner<Provider extends IEthersSignerProvider = IEthersSignerProvider> implements IEthersSigner {
    protected signer: ethers.Signer;
    protected readonly transactionParser: EthersTransactionParser;

    readonly provider: Provider;

    constructor(signer: ethers.Signer, provider?: Provider) {
        if (provider) this.provider = provider;
        else if (signer.provider) {
            this.provider = new EthersProvider(signer.provider) as unknown as Provider;
        } else throw new SignerError(EthersSignerErrors.PROVIDER_NOT_PROVIDED);

        this.transactionParser = new EthersTransactionParser();
        this.signer = signer;
    }

    /**
     * @inheritdoc
     */
    protected getERC20Contract(address: string): ERC20 {
        return this.provider.getERC20Contract(address, this.signer);
    }

    /**
     * @inheritdoc
     */
    protected getInterchainTokenServiceContract(address: string): InterchainTokenService {
        return this.provider.getInterchainTokenServiceContract(address, this.signer);
    }

    /**
     * @inheritdoc
     */
    protected getAxelarAmplifierGatewayContract(address: string): AxelarAmplifierGateway {
        return this.provider.getAxelarAmplifierGatewayContract(address, this.signer);
    }

    /**
     * @inheritdoc
     */
    async getAxelarGasServiceContract(address: string): Promise<AxelarGasService> {
        return this.provider.getAxelarGasServiceContract(address, this.signer);
    }

    /**
     * @inheritdoc
     */
    async getAddress(): Promise<string> {
        return this.signer.getAddress();
    }

    /**
     * @inheritdoc
     */
    async approveERC20(address: string, spender: string): Promise<Unconfirmed<Transaction>> {
        const erc20 = this.getERC20Contract(address);
        const contractTx = await erc20.approve(spender, ethers.MaxUint256);

        return this.transactionParser.parseTransactionResponse(contractTx);
    }

    /**
     * @inheritdoc
     */
    async transfer(
        amount: string,
        token: Token,
        doorAddress: string,
        destinationChainId: string,
        destinationAddress: string,
        options?: {
            gasLimit?: number;
            gasValue?: string;
        },
    ): Promise<Unconfirmed<EthersTransaction>> {
        const interchainTokenService = this.getInterchainTokenServiceContract(doorAddress);

        const gasValue = options?.gasValue ? options.gasValue : ethers.parseEther("0.5");
        const contractTx = await interchainTokenService.interchainTransfer(
            token.id!,
            destinationChainId,
            destinationAddress,
            amount,
            "0x",
            gasValue,
            { value: gasValue },
        );
        console.log("tx hash");
        console.log(contractTx.hash);
        console.log(contractTx);
        console.log("amount", amount);

        return this.transactionParser.parseTransactionResponse(contractTx, (txReceipt) => ({
            gasUsed: txReceipt!.gasUsed,
            gasPrice: txReceipt!.gasPrice,
        }));
    }

    /**
     * @inheritdoc
     */
    async callContract(
        sourceGatewayAddress: string,
        destinationChainId: string,
        destinationContractAddress: string,
        payload: string,
    ): Promise<Unconfirmed<Transaction>> {
        const axelarAmplifierGateway = this.getAxelarAmplifierGatewayContract(sourceGatewayAddress);

        const contractTx = await axelarAmplifierGateway.callContract(destinationChainId, destinationContractAddress, payload);

        return this.transactionParser.parseTransactionResponse(contractTx);
    }

    /**
     * Adds native gas for a cross-chain transaction using the Axelar Gas Service contract.
     * @param address The address of the Axelar Gas Service contract.
     * @param txHash The transaction hash for which to add native gas.
     * @param logIndex The log index associated with the cross-chain event.
     * @param gasValue The amount of native gas (in wei, as a string) to add.
     * @param options Optional transaction options (e.g., gas limit).
     * @returns An unconfirmed transaction object.
     */
    async addNativeGas(
        address: string,
        txHash: string,
        logIndex: number,
        gasValue: string,
        options?: { gasLimit: number },
    ): Promise<Unconfirmed<Transaction>> {
        const gasService = await this.getAxelarGasServiceContract(address);

        const refundAddress = await this.signer.getAddress();

        const contractTx = await gasService.addNativeGas(txHash, logIndex, refundAddress, {
            value: gasValue,
            gasLimit: options?.gasLimit,
        });

        return this.transactionParser.parseTransactionResponse(contractTx);
    }
}
