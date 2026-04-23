/* eslint-disable jsdoc/require-returns */
/* eslint-disable jsdoc/require-jsdoc */
import { makeSignDoc as makeSignDocAmino, StdFee } from "@cosmjs/amino";
import { fromBase64 } from "@cosmjs/encoding";
import { Int53, Uint53 } from "@cosmjs/math";
import {
    EncodeObject,
    GeneratedType,
    isOfflineDirectSigner,
    makeAuthInfoBytes,
    makeSignDoc,
    OfflineSigner,
    Registry,
    TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import {
    StargateClientOptions,
    AminoTypes,
    GasPrice,
    AminoConverters,
    createAuthzAminoConverters,
    createBankAminoConverters,
    createDistributionAminoConverters,
    createGovAminoConverters,
    createStakingAminoConverters,
    createIbcAminoConverters,
    createFeegrantAminoConverters,
    createVestingAminoConverters,
    StargateClient,
    DeliverTxResponse,
    MsgSendEncodeObject,
    MsgDelegateEncodeObject,
    MsgUndelegateEncodeObject,
    MsgWithdrawDelegatorRewardEncodeObject,
    MsgTransferEncodeObject,
    calculateFee,
} from "@cosmjs/stargate";
import {
    authzTypes,
    bankTypes,
    distributionTypes,
    feegrantTypes,
    govTypes,
    groupTypes,
    stakingTypes,
    ibcTypes,
    vestingTypes,
} from "@cosmjs/stargate/build/modules";
import { CometClient, connectComet, HttpEndpoint } from "@cosmjs/tendermint-rpc";
import { assert, assertDefined } from "@cosmjs/utils";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgDelegate, MsgUndelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { Height } from "cosmjs-types/ibc/core/client/v1/client";
import { encodeSecp256k1Pubkey } from "./secp256k1";
import { encodePubkey } from "./pubkey";

export const defaultRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
    ["/cosmos.base.v1beta1.Coin", Coin],
    ...authzTypes,
    ...bankTypes,
    ...distributionTypes,
    ...feegrantTypes,
    ...govTypes,
    ...groupTypes,
    ...stakingTypes,
    ...ibcTypes,
    ...vestingTypes,
];

/**
 * Signing information for a single signer that is not included in the transaction.
 * @see https://github.com/cosmos/cosmos-sdk/blob/v0.42.2/x/auth/signing/sign_mode_handler.go#L23-L37
 */
export interface SignerData {
    readonly accountNumber: number;
    readonly sequence: number;
    readonly chainId: string;
}

/** Use for testing only */
export interface PrivateSigningStargateClient {
    readonly registry: Registry;
}

export interface SigningStargateClientOptions extends StargateClientOptions {
    readonly registry?: Registry;
    readonly aminoTypes?: AminoTypes;
    readonly broadcastTimeoutMs?: number;
    readonly broadcastPollIntervalMs?: number;
    readonly gasPrice?: GasPrice;
}

export function createDefaultAminoConverters(): AminoConverters {
    return {
        ...createAuthzAminoConverters(),
        ...createBankAminoConverters(),
        ...createDistributionAminoConverters(),
        ...createGovAminoConverters(),
        ...createStakingAminoConverters(),
        ...createIbcAminoConverters(),
        ...createFeegrantAminoConverters(),
        ...createVestingAminoConverters(),
    };
}

export class SigningStargateClient extends StargateClient {
    readonly registry: Registry;
    readonly broadcastTimeoutMs: number | undefined;
    readonly broadcastPollIntervalMs: number | undefined;

    private readonly signer: OfflineSigner;
    private readonly aminoTypes: AminoTypes;
    private readonly gasPrice: GasPrice | undefined;
    // Starting with Cosmos SDK 0.47, we see many cases in which 1.3 is not enough anymore
    // E.g. https://github.com/cosmos/cosmos-sdk/issues/16020
    private readonly defaultGasMultiplier = 1.4;

    static async connectWithSigner(
        endpoint: string | HttpEndpoint,
        signer: OfflineSigner,
        options: SigningStargateClientOptions = {},
    ): Promise<SigningStargateClient> {
        const cometClient = await connectComet(endpoint);
        return SigningStargateClient.createWithSigner(cometClient, signer, options);
    }

    static async createWithSigner(
        cometClient: CometClient,
        signer: OfflineSigner,
        options: SigningStargateClientOptions = {},
    ): Promise<SigningStargateClient> {
        return new SigningStargateClient(cometClient, signer, options);
    }

    static async offline(signer: OfflineSigner, options: SigningStargateClientOptions = {}): Promise<SigningStargateClient> {
        return new SigningStargateClient(undefined, signer, options);
    }

    protected constructor(cometClient: CometClient | undefined, signer: OfflineSigner, options: SigningStargateClientOptions) {
        super(cometClient, options);
        const { registry = new Registry(defaultRegistryTypes), aminoTypes = new AminoTypes(createDefaultAminoConverters()) } = options;
        this.registry = registry;
        this.aminoTypes = aminoTypes;
        this.signer = signer;
        this.broadcastTimeoutMs = options.broadcastTimeoutMs;
        this.broadcastPollIntervalMs = options.broadcastPollIntervalMs;
        this.gasPrice = options.gasPrice;
    }

    async simulate(signerAddress: string, messages: readonly EncodeObject[], memo: string | undefined): Promise<number> {
        const anyMsgs = messages.map((m) => this.registry.encodeAsAny(m));
        const accountFromSigner = (await this.signer.getAccounts()).find((account) => account.address === signerAddress);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        const pubkey = encodeSecp256k1Pubkey(accountFromSigner.pubkey, true); // true for Ethermint
        const { sequence } = await this.getSequence(signerAddress);
        const { gasInfo } = await this.forceGetQueryClient().tx.simulate(anyMsgs, memo, pubkey, sequence);
        assertDefined(gasInfo);
        return Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
    }

    async sendTokens(
        senderAddress: string,
        recipientAddress: string,
        amount: readonly Coin[],
        fee: StdFee | "auto" | number,
        memo = "",
    ): Promise<DeliverTxResponse> {
        const sendMsg: MsgSendEncodeObject = {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
                fromAddress: senderAddress,
                toAddress: recipientAddress,
                amount: [...amount],
            },
        };
        return this.signAndBroadcast(senderAddress, [sendMsg], fee, memo);
    }

    async delegateTokens(
        delegatorAddress: string,
        validatorAddress: string,
        amount: Coin,
        fee: StdFee | "auto" | number,
        memo = "",
    ): Promise<DeliverTxResponse> {
        const delegateMsg: MsgDelegateEncodeObject = {
            typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
            value: MsgDelegate.fromPartial({
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: amount,
            }),
        };
        return this.signAndBroadcast(delegatorAddress, [delegateMsg], fee, memo);
    }

    async undelegateTokens(
        delegatorAddress: string,
        validatorAddress: string,
        amount: Coin,
        fee: StdFee | "auto" | number,
        memo = "",
    ): Promise<DeliverTxResponse> {
        const undelegateMsg: MsgUndelegateEncodeObject = {
            typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
            value: MsgUndelegate.fromPartial({
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: amount,
            }),
        };
        return this.signAndBroadcast(delegatorAddress, [undelegateMsg], fee, memo);
    }

    async withdrawRewards(
        delegatorAddress: string,
        validatorAddress: string,
        fee: StdFee | "auto" | number,
        memo = "",
    ): Promise<DeliverTxResponse> {
        const withdrawMsg: MsgWithdrawDelegatorRewardEncodeObject = {
            typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
            value: MsgWithdrawDelegatorReward.fromPartial({
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
            }),
        };
        return this.signAndBroadcast(delegatorAddress, [withdrawMsg], fee, memo);
    }

    async sendIbcTokens(
        senderAddress: string,
        recipientAddress: string,
        transferAmount: Coin,
        sourcePort: string,
        sourceChannel: string,
        timeoutHeight: Height | undefined,
        /** timeout in seconds */
        timeoutTimestamp: number | undefined,
        fee: StdFee | "auto" | number,
        memo = "",
    ): Promise<DeliverTxResponse> {
        const timeoutTimestampNanoseconds = timeoutTimestamp ? BigInt(timeoutTimestamp) * BigInt(1_000_000_000) : undefined;
        const transferMsg: MsgTransferEncodeObject = {
            typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
            value: MsgTransfer.fromPartial({
                sourcePort: sourcePort,
                sourceChannel: sourceChannel,
                sender: senderAddress,
                receiver: recipientAddress,
                token: transferAmount,
                timeoutHeight: timeoutHeight,
                timeoutTimestamp: timeoutTimestampNanoseconds,
            }),
        };
        return this.signAndBroadcast(senderAddress, [transferMsg], fee, memo);
    }

    async signAndBroadcast(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee | "auto" | number,
        memo = "",
        timeoutHeight?: bigint,
    ): Promise<DeliverTxResponse> {
        let usedFee: StdFee;
        if (fee == "auto" || typeof fee === "number") {
            assertDefined(this.gasPrice, "Gas price must be set in the client options when auto gas is used.");
            const gasEstimation = await this.simulate(signerAddress, messages, memo);
            const multiplier = typeof fee === "number" ? fee : this.defaultGasMultiplier;
            usedFee = calculateFee(Math.round(gasEstimation * multiplier), this.gasPrice);
        } else {
            usedFee = fee;
        }
        const txRaw = await this.sign(signerAddress, messages, usedFee, memo, undefined, timeoutHeight);
        const txBytes = TxRaw.encode(txRaw).finish();
        return this.broadcastTx(txBytes, this.broadcastTimeoutMs, this.broadcastPollIntervalMs);
    }

    async signAndBroadcastSync(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee | "auto" | number,
        memo = "",
        timeoutHeight?: bigint,
    ): Promise<string> {
        let usedFee: StdFee;
        if (fee == "auto" || typeof fee === "number") {
            assertDefined(this.gasPrice, "Gas price must be set in the client options when auto gas is used.");
            const gasEstimation = await this.simulate(signerAddress, messages, memo);
            const multiplier = typeof fee === "number" ? fee : this.defaultGasMultiplier;
            usedFee = calculateFee(Math.round(gasEstimation * multiplier), this.gasPrice);
        } else {
            usedFee = fee;
        }
        const txRaw = await this.sign(signerAddress, messages, usedFee, memo, undefined, timeoutHeight);
        const txBytes = TxRaw.encode(txRaw).finish();
        return this.broadcastTxSync(txBytes);
    }

    async sign(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee,
        memo: string,
        explicitSignerData?: SignerData,
        timeoutHeight?: bigint,
    ): Promise<TxRaw> {
        let signerData: SignerData;
        if (explicitSignerData) {
            signerData = explicitSignerData;
        } else {
            const { accountNumber, sequence } = await this.getSequence(signerAddress);
            const chainId = await this.getChainId();
            signerData = {
                accountNumber: accountNumber,
                sequence: sequence,
                chainId: chainId,
            };
        }

        return isOfflineDirectSigner(this.signer)
            ? this.signDirect(signerAddress, messages, fee, memo, signerData, timeoutHeight)
            : this.signAmino(signerAddress, messages, fee, memo, signerData, timeoutHeight);
    }

    private async signAmino(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee,
        memo: string,
        { accountNumber, sequence, chainId }: SignerData,
        timeoutHeight?: bigint,
    ): Promise<TxRaw> {
        assert(!isOfflineDirectSigner(this.signer));
        const accountFromSigner = (await this.signer.getAccounts()).find((account) => account.address === signerAddress);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        const pubkey = encodePubkey(encodeSecp256k1Pubkey(accountFromSigner.pubkey, true)); // true for Ethermint
        const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
        const msgs = messages.map((msg) => this.aminoTypes.toAmino(msg));
        const signDoc = makeSignDocAmino(msgs, fee, chainId, memo, accountNumber, sequence, timeoutHeight);
        const { signature, signed } = await this.signer.signAmino(signerAddress, signDoc);
        const signedTxBody = {
            messages: signed.msgs.map((msg) => this.aminoTypes.fromAmino(msg)),
            memo: signed.memo,
            timeoutHeight: timeoutHeight,
        };
        const signedTxBodyEncodeObject: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: signedTxBody,
        };
        const signedTxBodyBytes = this.registry.encode(signedTxBodyEncodeObject);
        const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
        const signedSequence = Int53.fromString(signed.sequence).toNumber();
        const signedAuthInfoBytes = makeAuthInfoBytes(
            [{ pubkey, sequence: signedSequence }],
            signed.fee.amount,
            signedGasLimit,
            signed.fee.granter,
            signed.fee.payer,
            signMode,
        );
        return TxRaw.fromPartial({
            bodyBytes: signedTxBodyBytes,
            authInfoBytes: signedAuthInfoBytes,
            signatures: [fromBase64(signature.signature)],
        });
    }

    private async signDirect(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee,
        memo: string,
        { accountNumber, sequence, chainId }: SignerData,
        timeoutHeight?: bigint,
    ): Promise<TxRaw> {
        assert(isOfflineDirectSigner(this.signer));
        const accountFromSigner = (await this.signer.getAccounts()).find((account) => account.address === signerAddress);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        const pubkey = encodePubkey(encodeSecp256k1Pubkey(accountFromSigner.pubkey, true)); // true for Ethermint
        const txBodyEncodeObject: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: {
                messages: messages,
                memo: memo,
                timeoutHeight: timeoutHeight,
            },
        };
        const txBodyBytes = this.registry.encode(txBodyEncodeObject);
        const gasLimit = Int53.fromString(fee.gas).toNumber();
        const authInfoBytes = makeAuthInfoBytes([{ pubkey, sequence }], fee.amount, gasLimit, fee.granter, fee.payer);
        const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
        const { signature, signed } = await this.signer.signDirect(signerAddress, signDoc);
        return TxRaw.fromPartial({
            bodyBytes: signed.bodyBytes,
            authInfoBytes: signed.authInfoBytes,
            signatures: [fromBase64(signature.signature)],
        });
    }
}
