import { EvmXChainWalletProvider, EvmXChainWalletSigner } from "./interfaces";
import { EvmXChainWalletError, EvmXChainWalletErrors } from "./errors/EvmXChainWallet.errors";
import { TrustCommitXChainWallet } from "../../interfaces";
import { FormattedBridge } from "../../../bridge/Bridge";
import { ChainType } from "../../../common/types";
import {
    CommitTransaction,
    CreateAccountCommitTransaction,
    CreateBridgeRequestTransaction,
    CreateClaimTransaction,
    TrustCommitTransaction,
    Unconfirmed,
} from "../../../transaction/types";
import { ClaimId } from "../../../bridge/utils";
import { CreateBridgeRequestXChainWallet } from "../../interfaces";

export class EvmXChainWallet implements TrustCommitXChainWallet<ChainType.EVM>, CreateBridgeRequestXChainWallet<ChainType.EVM> {
    readonly type = ChainType.EVM;

    constructor(
        readonly provider: EvmXChainWalletProvider,
        readonly signer: EvmXChainWalletSigner,
    ) {}

    getAddress(): Promise<string> {
        return this.signer.getAddress();
    }

    async isActive(): Promise<boolean> {
        const address = await this.signer.getAddress();
        return this.provider.isAccountActive(address);
    }

    async getBalance(): Promise<string> {
        const address = await this.signer.getAddress();
        return this.provider.getNativeBalance(address);
    }

    isTrustCommitRequired(bridge: FormattedBridge<ChainType.EVM>): boolean {
        return !bridge.isNativeOriginIssue;
    }

    trustCommit(bridge: FormattedBridge<ChainType.EVM>): Promise<Unconfirmed<TrustCommitTransaction>> {
        if (bridge.isNativeOriginIssue) throw new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_TRUST_COMMIT_WITH_NATIVE_TOKEN);

        return this.signer.approveBridgeTokenContract(bridge);
    }

    async isCommitTrusted(bridge: FormattedBridge<ChainType.EVM>): Promise<boolean> {
        if (bridge.isNativeOriginIssue) throw new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_CHECK_COMMIT_TRUST_WITH_NATIVE_TOKEN);

        const address = await this.signer.getAddress();
        return this.provider.isBridgeTokenContractApproved(address, bridge);
    }

    createClaim(originAddress: string, bridge: FormattedBridge<ChainType.EVM>): Promise<Unconfirmed<CreateClaimTransaction>> {
        return this.signer.createClaim(originAddress, bridge);
    }

    commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.EVM>,
        amount: string,
    ): Promise<Unconfirmed<CommitTransaction>> {
        return this.signer.commit(claimId, destinationAddress, bridge, amount);
    }

    createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.EVM>,
        amount: string,
    ): Promise<Unconfirmed<CreateAccountCommitTransaction>> {
        if (!bridge.isNativeDestinationIssue) throw new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_CREATE_ACCOUNT_WITH_TOKENS);

        return this.signer.createAccountCommit(destinationAddress, bridge, amount);
    }

    async isClaimAttested(claimId: ClaimId, bridge: FormattedBridge<ChainType.EVM>): Promise<boolean> {
        const address = await this.signer.getAddress();
        return this.provider.isClaimAttested(address, claimId, bridge);
    }

    async isCreateAccountCommitAttested(): Promise<boolean> {
        const address = await this.signer.getAddress();
        return this.provider.isCreateAccountCommitAttested(address);
    }

    async createBridgeRequest(
        doorAddress: string,
        tokenAddress: string,
        issuingDoorAddress: string,
    ): Promise<Unconfirmed<CreateBridgeRequestTransaction>> {
        return await this.signer.createBridgeRequest(doorAddress, tokenAddress, issuingDoorAddress);
    }
}
