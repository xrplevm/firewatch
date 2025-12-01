import { ethers } from "ethers";
import { EthersXChainSignerProvider } from "./interfaces/EthersXChainSignerProvider";
import { EthersXChainSignerError, EthersXChainSignerErrors } from "./EthersXChainSigner.errors";
import { BridgeDoorMultiToken, BridgeToken } from "@peersyst/xrp-evm-contracts";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { EthersXChainProvider } from "../../../../provider/providers/evm";
import { FormattedBridge } from "../../../../bridge/Bridge";
import { CreateBridgeRequestTransaction, CreateClaimTransaction, Transaction, Unconfirmed } from "../../../../transaction/types";
import { ChainType } from "../../../../common/types";
import { ClaimId } from "../../../../bridge/utils";
import { EVM_DECIMALS } from "../../../../common/constants/evm.constants";
import { decimalToInt } from "../../../../common/utils/number";
import { EvmXChainWalletSigner } from "../../../../wallet/wallets/evm";
import { EthersTransactionParser } from "../../../../transaction/parsers/evm/ethers";

export class EthersXChainSigner<Provider extends EthersXChainSignerProvider = EthersXChainSignerProvider> implements EvmXChainWalletSigner {
    protected signer: ethers.Signer;
    protected readonly transactionParser: EthersTransactionParser;

    readonly provider: Provider;

    constructor(signer: ethers.Signer, provider?: Provider) {
        if (provider) this.provider = provider;
        else if (signer.provider) {
            this.provider = new EthersXChainProvider(signer.provider) as unknown as Provider;
        } else throw new EthersXChainSignerError(EthersXChainSignerErrors.PROVIDER_NOT_PROVIDED);

        this.transactionParser = new EthersTransactionParser(this.provider);
        this.signer = signer;
    }

    protected getBridgeContract(doorAddress: string): Promise<BridgeDoorMultiToken> {
        return this.provider.getBridgeContract(doorAddress, this.signer);
    }

    protected getBridgeTokenContract(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
    ): Promise<BridgeToken> {
        return this.provider.getBridgeTokenContract(doorAddressOrBridgeContract, xChainBridge, this.signer);
    }

    async getAddress(): Promise<string> {
        return this.signer.getAddress();
    }

    async approveBridgeTokenContract(bridge: FormattedBridge<ChainType.EVM>): Promise<Unconfirmed<Transaction>> {
        const bridgeContract = await this.getBridgeContract(bridge.originXChainBridgeChain.doorAddress);
        const tokenContract = await this.getBridgeTokenContract(bridgeContract, bridge.xChainBridge);

        const contractTx = await tokenContract.approve(bridgeContract.address, ethers.constants.MaxUint256);
        const unconfirmedTx = this.transactionParser.parseTransactionResponse(contractTx);

        return unconfirmedTx;
    }

    async createClaim(originAddress: string, bridge: FormattedBridge<ChainType.EVM>): Promise<Unconfirmed<CreateClaimTransaction>> {
        const bridgeContract = await this.getBridgeContract(bridge.destinationXChainBridgeChain.doorAddress);
        const contractTx = await bridgeContract.createClaimId(bridge.xChainBridge, originAddress, {
            value: bridge.destinationXChainBridgeChain.signatureReward,
        });
        const unconfirmedTx = this.transactionParser.parseCreateClaimTransactionResponse(contractTx);
        return unconfirmedTx;
    }

    async commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.EVM>,
        amount: string,
    ): Promise<Unconfirmed<Transaction>> {
        const isNative = bridge.isNativeOriginIssue;
        const bridgeContract = await this.getBridgeContract(bridge.originXChainBridgeChain.doorAddress);

        const decimals = isNative ? EVM_DECIMALS : await this.provider.getBridgeTokenDecimals(bridgeContract, bridge.xChainBridge);
        const sendingAmount = ethers.BigNumber.from(decimalToInt(amount, decimals));

        const contractTx = await bridgeContract.commit(bridge.xChainBridge, destinationAddress, claimId.int, sendingAmount, {
            value: bridge.isNativeOriginIssue ? sendingAmount.toString() : 0,
        });
        const unconfirmedTx = this.transactionParser.parseTransactionResponse(contractTx);
        return unconfirmedTx;
    }

    async createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.EVM>,
        amount: string,
    ): Promise<Unconfirmed<Transaction>> {
        const bridgeContract = await this.getBridgeContract(bridge.originXChainBridgeChain.doorAddress);

        const sendingAmount = ethers.BigNumber.from(decimalToInt(amount, EVM_DECIMALS));

        const contractTx = await bridgeContract.createAccountCommit(
            bridge.xChainBridge,
            destinationAddress,
            sendingAmount,
            bridge.destinationXChainBridgeChain.signatureReward,
            {
                // No need to check if the issue is native since create account commit can only be executed with the native currency.
                value: sendingAmount.add(bridge.destinationXChainBridgeChain.signatureReward).toString(),
            },
        );
        const unconfirmedTx = this.transactionParser.parseTransactionResponse(contractTx);
        return unconfirmedTx;
    }

    async createBridgeRequest(
        doorAddress: string,
        token: string,
        issuingDoorAddress: string,
    ): Promise<Unconfirmed<CreateBridgeRequestTransaction>> {
        const bridgeContract = await this.getBridgeContract(doorAddress);

        // Check that token is a ERC-20 address
        const isErc20Address = await this.provider.isErc20Address(token);
        if (!isErc20Address) throw new EthersXChainSignerError(EthersXChainSignerErrors.INVALID_ERC20_ADDRESS);

        // Check that token is not used by another bridge
        const isTokenAddressUsed = await this.provider.tokenBridgeExists(doorAddress, token, issuingDoorAddress);
        if (isTokenAddressUsed) throw new EthersXChainSignerError(EthersXChainSignerErrors.TOKEN_ADDRESS_ALREADY_USED);

        // Check that value satisfies the MIN_CREATE_BRIDGE_REWARD
        const minCreateBridgeReward = await this.provider.getMinCreateBridgeReward(doorAddress);

        const contractTx = await bridgeContract.createBridgeRequest(token, { value: minCreateBridgeReward });

        const unconfirmedTx = this.transactionParser.parseCreateBridgeRequestTransactionResponse(
            contractTx,
            doorAddress,
            token,
            issuingDoorAddress,
        );

        return unconfirmedTx;
    }
}
