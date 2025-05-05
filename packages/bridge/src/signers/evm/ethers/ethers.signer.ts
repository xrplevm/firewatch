import { ethers } from "ethers";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { IEthersSignerProvider } from "./interfaces/i-ethers-signer.provider";
import { EthersProvider } from "../../../providers/evm/ethers/ethers.provider";
import { SignerError } from "../../core/error";
import { EthersSignerErrors } from "./ethers.signer.errors";
import { EthersTransactionParser } from "../../../transaction-parsers/evm/ethers/ethers.transaction-parser";
import { AxelarAmplifierGateway, ERC20, InterchainToken, InterchainTokenService } from "@shared/evm/contracts";
import { decimalToInt } from "@shared/number";
import { IEthersSigner } from "./interfaces";
import { Token } from "@firewatch/core/token";
import BigNumber from "bignumber.js";
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

    getInterchainTokenContract(address: string): InterchainToken {
        return this.provider.getInterchainTokenContract(address, this.signer);
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
        gasToPay?: string,
    ): Promise<Unconfirmed<EthersTransaction>> {
        const sendingAmount = new BigNumber(decimalToInt(amount, token.decimals));

        const interchainTokenService = this.getInterchainTokenServiceContract(doorAddress);

        const contractTx = await interchainTokenService.interchainTransfer(
            token.id!,
            destinationChainId,
            destinationAddress,
            sendingAmount.toString(),
            "0x",
            gasToPay ? ethers.parseEther(gasToPay) : undefined,
            { gasValue: ethers.parseEther("1").toString() },
        );

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
        return this.transactionParser.parseTransactionResponse(contractTx as unknown as ethers.TransactionResponse);
    }

    async callContractWithToken(
        amount: string,
        token: Token,
        sourceGatewayAddress: string,
        destinationChainId: string,
        destinationContractAddress: string,
        payload: string,
    ): Promise<Unconfirmed<Transaction>> {
        // Get the Axelar Amplifier Gateway contract instance.
        const axelarAmplifierGateway = this.getAxelarAmplifierGatewayContract(sourceGatewayAddress);

        // Convert the amount from token units to the smallest unit using token.decimals.
        // Ensure that your Token type has a decimals property.
        const value = ethers.parseUnits(amount, token.decimals);

        // Call the contract's callContract method.
        // We assume the gateway contract's callContract method accepts an optional overrides parameter for value.
        const contractTx = await axelarAmplifierGateway.callContractWithToken(
            destinationChainId,
            destinationContractAddress,
            payload,
            token.symbol,
            value,
        );

        // Parse and return the transaction.
        return this.transactionParser.parseTransactionResponse(contractTx as unknown as ethers.TransactionResponse);
    }
}
