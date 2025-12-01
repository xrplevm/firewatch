import { XrpXChainWalletProvider, XrpXChainWalletSigner } from "./interfaces";
import { XrpXChainWalletError, XrpXChainWalletErrors } from "./errors/XrpXChainWallet.errors";
import { TrustClaimXChainWallet } from "../../interfaces";
import { ChainType } from "../../../common/types";
import { FormattedBridge } from "../../../bridge/Bridge";
import {
    CommitTransaction,
    CreateAccountCommitTransaction,
    CreateClaimTransaction,
    TrustClaimTransaction,
    Unconfirmed,
} from "../../../transaction/types";
import { ClaimId } from "../../../bridge/utils";

export class XrpXChainWallet implements TrustClaimXChainWallet<ChainType.XRP> {
    readonly type = ChainType.XRP;

    constructor(
        readonly provider: XrpXChainWalletProvider,
        readonly signer: XrpXChainWalletSigner,
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

    isTrustClaimRequired(bridge: FormattedBridge<ChainType.XRP>): boolean {
        return !bridge.isNativeDestinationIssue;
    }

    trustClaim(bridge: FormattedBridge<ChainType.XRP>): Promise<Unconfirmed<TrustClaimTransaction>> {
        if (bridge.isNativeDestinationIssue) throw new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_TRUST_CLAIM_WITH_NATIVE_CURRENCY);

        return this.signer.setTrustLine(
            bridge.destinationXChainBridgeChain.issue.issuer!,
            bridge.destinationXChainBridgeChain.issue.currency,
        );
    }

    async isClaimTrusted(bridge: FormattedBridge<ChainType.XRP>): Promise<boolean> {
        if (bridge.isNativeDestinationIssue)
            throw new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_CHECK_CLAIM_TRUST_WITH_NATIVE_CURRENCY);

        const address = await this.signer.getAddress();
        return this.provider.accountHasTrustLine(
            address,
            bridge.destinationXChainBridgeChain.issue.issuer!,
            bridge.destinationXChainBridgeChain.issue.currency,
        );
    }

    createClaim(originAddress: string, bridge: FormattedBridge<ChainType.XRP>): Promise<Unconfirmed<CreateClaimTransaction>> {
        return this.signer.createClaim(originAddress, bridge);
    }

    commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.XRP>,
        amount: string,
    ): Promise<Unconfirmed<CommitTransaction>> {
        return this.signer.commit(claimId, destinationAddress, bridge, amount);
    }

    createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.XRP>,
        amount: string,
    ): Promise<Unconfirmed<CreateAccountCommitTransaction>> {
        if (!bridge.isNativeDestinationIssue) throw new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_CREATE_ACCOUNT_WITH_IOU_CURRENCY);

        return this.signer.createAccountCommit(destinationAddress, bridge, amount);
    }

    async isClaimAttested(claimId: ClaimId, bridge: FormattedBridge<ChainType.XRP>): Promise<boolean> {
        const address = await this.signer.getAddress();
        return this.provider.isClaimAttested(address, claimId, bridge);
    }

    async isCreateAccountCommitAttested(): Promise<boolean> {
        const address = await this.signer.getAddress();
        return this.provider.isCreateAccountCommitAttested(address);
    }
}
