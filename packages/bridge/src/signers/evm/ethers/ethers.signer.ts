import { ethers } from "ethers";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { IEthersSignerProvider } from "./interfaces/i-ethers-signer.provider";
import { EthersProvider } from "../../../providers/evm/ethers/ethers.provider";
import { SignerError } from "../../core/error";
import { EthersSignerErrors } from "./ethers.signer.errors";
import { EthersTransactionParser } from "../../../transaction-parsers/evm/ethers/ethers.transaction-parser";
import { AxelarAmplifierGateway, ERC20, InterchainTokenService } from "@shared/evm/contracts";
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
    ): Promise<Unconfirmed<EthersTransaction>> {
        const sendingAmount = new BigNumber(decimalToInt(amount, token.decimals));

        const interchainTokenService = this.getInterchainTokenServiceContract(doorAddress);

        // TODO: get gasValue and Value from gasService.estimateGasFee
        const contractTx = await interchainTokenService.interchainTransfer(
            token.id!,
            destinationChainId,
            destinationAddress,
            sendingAmount.toString(),
            "0x",
            ethers.parseEther("5"),
            { value: ethers.parseEther("5") },
        );
        console.log("tx hash");
        console.log(contractTx.hash);
        console.log(contractTx);

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

        // TODO: add gas service
        // const gasService = this.getGasService();
        // const estimateGas = await gasService.getGasEstimate(
        // const payGas = await gasService.payNativeGasForContractCall

        const contractTx = await axelarAmplifierGateway.callContract(destinationChainId, destinationContractAddress, payload, {});

        return this.transactionParser.parseTransactionResponse(contractTx);
    }
}
