import BigNumber from "bignumber.js";
import { BridgeDoor, BridgeDoorPair } from "../BridgeDoor";
import { BridgeManagerError, BridgeManagerErrors } from "./BridgeManager.errors";
import { Bridge } from "../Bridge/Bridge";
import { BridgeManagerEventEmitter } from "./events/BridgeManagerEventEmitter";
import {
    BasicBridgeTransferResult,
    BridgeTransferResult,
    BridgeTransferStage,
    BridgeTransferStartData,
    BridgeTransferType,
    GetXChainBridgesOptions,
} from "./BridgeManager.types";
import { ClaimId } from "../utils";
import { ATTESTATIONS_POLLING_OPTIONS } from "./BridgeManager.constants";
import { XChainAddress, XChainBridge, XChainBridgeIssue } from "../../xchain";
import { BridgeDirection, ChainType } from "../../common/types";
import { CreateBridgeRequestXChainWallet, TrustClaimXChainWallet, TrustCommitXChainWallet, XChainWallet } from "../../wallet/interfaces";
import { decimalToInt, intToDecimal } from "../../common/utils/number";
import { CHAIN_DECIMALS } from "../../common/constants/chain.constants";
import { isTrustClaimXChainWallet, isTrustCommitXChainWallet } from "../../wallet/utils";
import {
    CommitTransaction,
    Confirmed,
    CreateBridgeRequestTransaction,
    CreateClaimTransaction,
    TrustClaimTransaction,
    TrustCommitTransaction,
} from "../../transaction/types";
import { polling } from "../../common/utils/promise";
import { XChainTokenFormat } from "../../xchain/XChainToken";

/**
 * Class that manages a bridge.
 */
export class BridgeManager {
    /**
     * The event emitter of the BridgeManager.
     */
    private readonly eventEmitter = new BridgeManagerEventEmitter();

    /**
     * The bridge door pair.
     */
    private bridgeDoorPair: BridgeDoorPair;
    /**
     * The cached XChainBridges of the bridge.
     */
    private xChainBridges: XChainBridge[] = [];

    /**
     * The initialization promise.
     */
    private _initialization: Promise<void>;
    get initialization(): Promise<void> {
        return this._initialization;
    }
    private set initialization(initialization: Promise<void>) {
        this._initialization = initialization;
    }

    /**
     * The xChainBridges load promise.
     */
    private _xChainBridgesLoad: Promise<void>;
    get xChainBridgesLoad(): Promise<void> {
        return this._xChainBridgesLoad;
    }
    private set xChainBridgesLoad(xChainBridgesLoad: Promise<void>) {
        this._xChainBridgesLoad = xChainBridgesLoad;
    }

    /**
     * The BridgeManager constructor.
     * The resulting BridgeManager.initialization should be awaited before using the BridgeManager.
     * To use async/await, use BridgeManager.createAsync().
     */
    constructor(...args: [BridgeDoorPair] | [BridgeDoor, BridgeDoor]) {
        if (args.length === 1) this.bridgeDoorPair = args[0];
        else this.bridgeDoorPair = new BridgeDoorPair(...args);

        this.initialization = this.initialize();
    }

    /**
     * **Recommended** constructor to use async/await.
     */
    static async createAsync(...args: [BridgeDoorPair] | [BridgeDoor, BridgeDoor]): Promise<BridgeManager> {
        const bridgeManager = new BridgeManager(...args);

        await bridgeManager.initialization;

        return bridgeManager;
    }

    /**
     * An alternative constructor.
     * The resulting BridgeManager.initialization should be awaited before using the BridgeManager.
     * To use async/await, use BridgeManager.createAsync().
     */
    static create(...args: [BridgeDoorPair] | [BridgeDoor, BridgeDoor]): BridgeManager {
        return new BridgeManager(...args);
    }

    /**
     * Initializes the BridgeManager.
     */
    private async initialize(): Promise<void> {
        // Preload XChainBridges
        await this.loadXChainBridges();
    }

    /**
     * Gets the display name of a bridge door.
     * @param bridgeDoor The bridge door.
     * @returns The display name of the bridge door.
     */
    private getBridgeDoorDisplayName(bridgeDoor: BridgeDoor): string {
        return bridgeDoor.id || `${bridgeDoor.type}.${bridgeDoor.address}`;
    }

    /**
     * Loads the XChainBridges of the bridge.
     */
    private async loadXChainBridges(): Promise<void> {
        this.xChainBridgesLoad = this._loadXChainBridges();
        await this.xChainBridgesLoad;
    }

    /**
     * Loads the XChainBridges of the bridge.
     */
    private async _loadXChainBridges(): Promise<void> {
        const [mainchainXChainBridges, sidechainXChainBridges] = await Promise.all([
            this.bridgeDoorPair.mainchainDoor.getXChainBridges(),
            this.bridgeDoorPair.sidechainDoor.getXChainBridges(),
        ]);

        const xChainBridges = [];
        for (const mainchainXChainBridge of mainchainXChainBridges) {
            for (let i = 0; i < sidechainXChainBridges.length; i++) {
                const sidechainXChainBridge = sidechainXChainBridges[i];
                if (mainchainXChainBridge.equals(sidechainXChainBridge)) {
                    // Remove the matching sidechain XChainBridge
                    sidechainXChainBridges.splice(i, 1);
                    try {
                        xChainBridges.push(mainchainXChainBridge.merge(sidechainXChainBridge));
                    } catch (_) {}
                    break;
                }
            }
        }

        if (xChainBridges.length < 1)
            throw new BridgeManagerError(BridgeManagerErrors.EMPTY_BRIDGE_DOOR_PAIR, {
                mainchain: this.getBridgeDoorDisplayName(this.bridgeDoorPair.mainchainDoor),
                sidechain: this.getBridgeDoorDisplayName(this.bridgeDoorPair.sidechainDoor),
            });

        this.xChainBridges = xChainBridges;
    }

    /**
     * Gets the XChainBridges of the bridge.
     * @returns The XChainBridges of the bridge.
     */
    async getXChainBridges({ refresh = false }: GetXChainBridgesOptions = {}): Promise<XChainBridge[]> {
        // Await initialization
        await this.initialization;
        // Await xChainBridges load
        // This will resolve immediately if initialization did not
        // This will be awaited when xChainBridges are refreshed
        await this.xChainBridgesLoad;

        if (refresh) await this.loadXChainBridges();

        return this.xChainBridges;
    }

    /**
     * Gets a Bridge.
     * @param direction The direction of the bridge.
     * @param matcher A [currency, issuer] pair or an XChainBridgeIssue.
     * @returns The Bridge.
     */
    async getBridge(
        direction: BridgeDirection,
        ...matcher: [currency: string, issuer?: string] | [matcher: XChainBridgeIssue<any>]
    ): Promise<Bridge> {
        await this.initialization;

        let currency: string, issuer: string | undefined;

        if (typeof matcher[0] === "string") {
            currency = matcher[0] as string;
            issuer = matcher[1] as string | undefined;
        } else {
            const issue = matcher[0] as XChainBridgeIssue<any>;
            currency = issue.currency;
            issuer = issue.issuer?.address;
        }

        const xChainBridge = this.xChainBridges.find(
            (xChainBridge) =>
                (xChainBridge.issuingChain.issue.currency === currency && xChainBridge.issuingChain.issue.issuer?.address === issuer) ||
                (xChainBridge.lockingChain.issue.currency === currency && xChainBridge.lockingChain.issue.issuer?.address === issuer),
        );

        if (!xChainBridge)
            throw new BridgeManagerError(BridgeManagerErrors.BRIDGE_NOT_FOUND_FOR_ISSUE, {
                currency,
                issuer,
                mainchain: this.getBridgeDoorDisplayName(this.bridgeDoorPair.mainchainDoor),
                sidechain: this.getBridgeDoorDisplayName(this.bridgeDoorPair.sidechainDoor),
            });

        return new Bridge(direction, xChainBridge);
    }

    /**
     * Handles transfer errors and emits the corresponding events.
     * @param error The error to handle.
     * @param stage The stage where the error occurred.
     */
    private handleTransferError(error: any, stage?: BridgeTransferStage): any {
        if (stage) this.eventEmitter.emit(`${stage}Failed`, error);
        this.eventEmitter.emit("failed", error);

        return error;
    }

    /**
     * Sets a listener for the given event.
     * @param event The event.
     * @param listener The listener.
     * @returns An unsubscribe function.
     */
    readonly on: BridgeManagerEventEmitter["on"] = this.eventEmitter.on.bind(this.eventEmitter);

    /**
     * Prepares a create account commit transfer.
     * @param bridge The bridge.
     * @param amount The amount to transfer with decimals
     * @param originWallet The origin wallet.
     * @returns The data necessary to start a transfer.
     */
    async prepareCreateAccountCommitTransfer<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, undefined>,
        amount: string,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
    ): Promise<BridgeTransferStartData> {
        // Check `minAccountCreate` is set
        if (!bridge.originXChainBridgeChain.minAccountCreate) {
            throw this.handleTransferError(
                new BridgeManagerError(BridgeManagerErrors.MIN_CREATE_ACCOUNT_NOT_SET, {
                    currency: bridge.originXChainBridgeChain.issue.currency,
                    origin: bridge.originXChainBridgeChain.doorAddress.address,
                    destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                }),
            );
        }

        // Check `amount` greater or equal to `minAccountCreate`
        if (
            BigNumber(decimalToInt(amount, CHAIN_DECIMALS[bridge.originType])).lt(
                BigNumber(bridge.originXChainBridgeChain.minAccountCreate),
            )
        ) {
            throw this.handleTransferError(
                new BridgeManagerError(BridgeManagerErrors.INSUFFICIENT_CREATE_ACCOUNT_AMOUNT, {
                    currency: bridge.originXChainBridgeChain.issue.currency,
                    origin: bridge.originXChainBridgeChain.doorAddress.address,
                    destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                    amount,
                    minAccountCreate: intToDecimal(bridge.originXChainBridgeChain.minAccountCreate, CHAIN_DECIMALS[bridge.originType]),
                }),
            );
        }

        // Check the origin account can pay the signature reward
        const originBalance = await originWallet.getBalance();
        if (BigNumber(originBalance).lt(BigNumber(bridge.originXChainBridgeChain.signatureReward))) {
            throw this.handleTransferError(
                new BridgeManagerError(BridgeManagerErrors.ORIGIN_CANNOT_PAY_SIGNATURE_REWARD, {
                    currency: bridge.originXChainBridgeChain.issue.currency,
                    origin: bridge.originXChainBridgeChain.doorAddress.address,
                    destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                    signatureReward: intToDecimal(bridge.originXChainBridgeChain.signatureReward, CHAIN_DECIMALS[bridge.originType]),
                }),
            );
        }

        return { transferType: BridgeTransferType.CREATE_ACCOUNT, amount };
    }

    /**
     * Prepares a claim/commit transfer.
     * @param bridge The bridge.
     * @param amount The amount to transfer with decimals
     * @param originWallet The origin wallet.
     * @param destinationWallet The destination wallet.
     * @returns The data necessary to start a transfer.
     */
    async prepareClaimCommitTransfer<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, undefined>,
        amount: string,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
    ): Promise<BridgeTransferStartData> {
        // Check the destination account can pay the signature reward
        const destinationBalance = await destinationWallet.getBalance();
        if (BigNumber(destinationBalance).lt(BigNumber(bridge.destinationXChainBridgeChain.signatureReward))) {
            throw this.handleTransferError(
                new BridgeManagerError(BridgeManagerErrors.DESTINATION_CANNOT_PAY_SIGNATURE_REWARD, {
                    currency: bridge.originXChainBridgeChain.issue.currency,
                    origin: bridge.originXChainBridgeChain.doorAddress.address,
                    destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                    signatureReward: intToDecimal(
                        bridge.destinationXChainBridgeChain.signatureReward,
                        CHAIN_DECIMALS[bridge.destinationType],
                    ),
                }),
            );
        }

        const bridgeForOrigin = bridge.forOrigin();
        const bridgeForDestination = bridge.forDestination();

        const isTrustClaimRequired = isTrustClaimXChainWallet(destinationWallet)
            ? destinationWallet.isTrustClaimRequired(bridgeForDestination)
            : false;
        const isTrustCommitRequired = isTrustCommitXChainWallet(originWallet) ? originWallet.isTrustCommitRequired(bridgeForOrigin) : false;

        return {
            transferType: BridgeTransferType.CLAIM_COMMIT,
            isTrustClaimRequired,
            isTrustCommitRequired,
            amount,
        };
    }

    /**
     * Prepares the transfer.
     * @param bridge The bridge.
     * @param amount The amount to transfer with decimals
     * @param originWallet The origin wallet.
     * @param destinationWallet The destination wallet.
     * @returns The data necessary to start a transfer.
     */
    async prepareTransfer<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, undefined>,
        amount: string,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
    ): Promise<BridgeTransferStartData> {
        let bridgeTransferStartData: BridgeTransferStartData;

        const isCreateAccount = !(await destinationWallet.isActive());

        if (isCreateAccount) bridgeTransferStartData = await this.prepareCreateAccountCommitTransfer(bridge, amount, originWallet);
        else bridgeTransferStartData = await this.prepareClaimCommitTransfer(bridge, amount, originWallet, destinationWallet);

        this.eventEmitter.emit("start", bridgeTransferStartData);

        return bridgeTransferStartData;
    }

    /**
     * Performs the trust claim stage.
     * @param bridge The bridge to use.
     * @param destinationWallet The destination wallet.
     * @returns The confirmed trust claim transaction.
     */
    async trustClaim<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, any>,
        destinationWallet: TrustClaimXChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
    ): Promise<Confirmed<TrustClaimTransaction> | undefined> {
        let trustClaimResult: Confirmed<TrustClaimTransaction> | undefined = undefined;

        const bridgeForDestination = bridge.format === bridge.destinationType ? bridge : bridge.forDestination();

        try {
            const isClaimTrusted = await destinationWallet.isClaimTrusted(bridgeForDestination);

            if (isClaimTrusted) {
                this.eventEmitter.emit("trustClaimConfirmed");
            } else {
                this.eventEmitter.emit("stage", BridgeTransferStage.TRUST_CLAIM);
                this.eventEmitter.emit("trustClaimRequested");
                const unconfirmedTrustClaim = await destinationWallet.trustClaim(bridgeForDestination);
                this.eventEmitter.emit("trustClaimSigned", unconfirmedTrustClaim);
                trustClaimResult = await unconfirmedTrustClaim.wait();
                this.eventEmitter.emit("trustClaimConfirmed", trustClaimResult);
            }

            return trustClaimResult;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.TRUST_CLAIM);
        }
    }

    /**
     * Performs the trust commit stage.
     * @param bridge The bridge to use.
     * @param originWallet The origin wallet.
     * @returns The confirmed trust commit transaction.
     */
    async trustCommit<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, any>,
        originWallet: TrustCommitXChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
    ): Promise<Confirmed<TrustCommitTransaction> | undefined> {
        let trustCommitResult: Confirmed<TrustCommitTransaction> | undefined = undefined;

        const bridgeForOrigin = bridge.format === bridge.originType ? bridge : bridge.forOrigin();

        try {
            const isCommitTrusted = await originWallet.isCommitTrusted(bridgeForOrigin);

            if (isCommitTrusted) {
                this.eventEmitter.emit("trustCommitConfirmed");
            } else {
                this.eventEmitter.emit("stage", BridgeTransferStage.TRUST_COMMIT);
                this.eventEmitter.emit("trustCommitRequested");
                const unconfirmedTrustCommit = await originWallet.trustCommit(bridgeForOrigin);
                this.eventEmitter.emit("trustCommitSigned", unconfirmedTrustCommit);
                trustCommitResult = await unconfirmedTrustCommit.wait();
                this.eventEmitter.emit("trustCommitConfirmed", trustCommitResult);
            }

            return trustCommitResult;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.TRUST_COMMIT);
        }
    }

    /**
     * Performs the create claim stage.
     * @param bridge The bridge to use.
     * @param destinationWallet The destination wallet.
     * @param originAddress The origin address.
     * @returns The confirmed create claim transaction.
     */
    async createClaim<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, any>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
        originAddress: XChainAddress<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
    ): Promise<Confirmed<CreateClaimTransaction>> {
        const bridgeForDestination = bridge.format === bridge.destinationType ? bridge : bridge.forDestination();
        const originAddressForDestination = originAddress.for(bridge.destinationType);

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.CREATE_CLAIM);
            this.eventEmitter.emit("createClaimRequested");
            const unconfirmedCreateClaim = await destinationWallet.createClaim(originAddressForDestination, bridgeForDestination);
            this.eventEmitter.emit("createClaimSigned", unconfirmedCreateClaim);
            const confirmedCreateClaim = await unconfirmedCreateClaim.wait();
            this.eventEmitter.emit("createClaimConfirmed", confirmedCreateClaim);
            return confirmedCreateClaim;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.CREATE_CLAIM);
        }
    }

    /**
     * Performs the commit stage.
     * @param claimId The claim id to commit.
     * @param bridge The bridge to use.
     * @param originWallet The origin wallet.
     * @param destinationAddress The destination address.
     * @param amount The amount to commit (with decimals).
     * @returns The confirmed commit transaction.
     */
    async commit<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        claimId: ClaimId,
        bridge: Bridge<LT, IT, D, any>,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
        destinationAddress: XChainAddress<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
        amount: string,
    ): Promise<Confirmed<CommitTransaction>> {
        const bridgeForOrigin = bridge.format === bridge.originType ? bridge : bridge.forOrigin();
        const destinationAddressForOrigin = destinationAddress.for(bridge.originType);

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.COMMIT);
            this.eventEmitter.emit("commitRequested");
            const unconfirmedCommit = await originWallet.commit(claimId, destinationAddressForOrigin, bridgeForOrigin, amount);
            this.eventEmitter.emit("commitSigned", unconfirmedCommit);
            const confirmedCommit = await unconfirmedCommit.wait();
            this.eventEmitter.emit("commitConfirmed", confirmedCommit);
            return confirmedCommit;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.COMMIT);
        }
    }

    /**
     * Performs the create account stage
     * @param bridge The bridge to use.
     * @param originWallet The origin wallet.
     * @param destinationAddress The destination address.
     * @param amount The amount to commit (with decimals).
     * @returns The confirmed create account commit transaction.
     */
    async createAccountCommit<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, any>,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
        destinationAddress: XChainAddress<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
        amount: string,
    ): Promise<Confirmed<CommitTransaction>> {
        const bridgeForOrigin = bridge.format === bridge.originType ? bridge : bridge.forOrigin();
        const destinationAddressForOrigin = destinationAddress.for(bridge.originType);

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.CREATE_ACCOUNT_COMMIT);
            this.eventEmitter.emit("createAccountCommitRequested");
            const unconfirmedCreateAccountCommit = await originWallet.createAccountCommit(
                destinationAddressForOrigin,
                bridgeForOrigin,
                amount,
            );
            this.eventEmitter.emit("createAccountCommitSigned", unconfirmedCreateAccountCommit);
            const confirmedCreateAccountCommit = await unconfirmedCreateAccountCommit.wait();
            this.eventEmitter.emit("createAccountCommitConfirmed", confirmedCreateAccountCommit);
            return confirmedCreateAccountCommit;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.CREATE_ACCOUNT_COMMIT);
        }
    }

    /**
     * Awaits claim attestations.
     * @param claimId The claim id of the claim to await.
     * @param bridge The bridge to use.
     * @param destinationWallet The destination wallet.
     */
    async awaitClaimAttestations<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        claimId: ClaimId,
        bridge: Bridge<LT, IT, D, any>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
    ): Promise<void> {
        const bridgeForDestination = bridge.format === bridge.destinationType ? bridge : bridge.forDestination();

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.ATTESTATIONS);
            this.eventEmitter.emit("attestationsStarted");
            await polling(
                () => destinationWallet.isClaimAttested(claimId, bridgeForDestination),
                (attested) => !attested,
                ATTESTATIONS_POLLING_OPTIONS,
            );
            this.eventEmitter.emit("attestationsCompleted");
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.ATTESTATIONS);
        }
    }

    /**
     * Awaits create account commit attestations.
     * @param bridge The bridge to use.
     * @param destinationWallet The destination wallet.
     */
    async awaitCreateAccountCommitAttestations<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, any>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
    ): Promise<void> {
        const bridgeForDestination = bridge.format === bridge.destinationType ? bridge : bridge.forDestination();

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.ATTESTATIONS);
            this.eventEmitter.emit("attestationsStarted");
            await polling(
                () => destinationWallet.isCreateAccountCommitAttested(bridgeForDestination),
                (attested) => !attested,
                ATTESTATIONS_POLLING_OPTIONS,
            );
            this.eventEmitter.emit("attestationsCompleted");
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.ATTESTATIONS);
        }
    }

    /**
     * Performs a complete transfer of funds from destination wallet to origin wallet through the provided bridge.
     * This method handles all the logic of the transfer.
     * @param bridge The bridge to use.
     * @param originWallet The origin wallet.
     * @param destinationWallet The destination wallet.
     * @param amount The amount to transfer (with decimals).
     * @returns The result of the transfer.
     */
    async transfer<LT extends ChainType, IT extends ChainType, D extends BridgeDirection>(
        bridge: Bridge<LT, IT, D, undefined>,
        originWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT>,
        destinationWallet: XChainWallet<D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT>,
        amount: string,
    ): Promise<BridgeTransferResult> {
        const bridgeTransferStartData = await this.prepareTransfer(bridge, amount, originWallet, destinationWallet);

        const originType = bridge.originXChainBridgeChain.type;
        const destinationType = bridge.destinationXChainBridgeChain.type;

        const [originWalletAddress, destinationWalletAddress] = await Promise.all([
            originWallet.getAddress(),
            destinationWallet.getAddress(),
        ]);
        const originAddress = new XChainAddress(originWalletAddress, originType);
        const destinationAddress = new XChainAddress(destinationWalletAddress, destinationType);

        const bridgeForOrigin = bridge.forOrigin();
        const bridgeForDestination = bridge.forDestination();

        const basicBridgeTransferResult: BasicBridgeTransferResult = {
            amount,
            originAddress: originWalletAddress,
            destinationAddress: destinationWalletAddress,
            originXChainBridgeChain: bridge.originXChainBridgeChain,
            destinationXChainBridgeChain: bridge.destinationXChainBridgeChain,
        };
        let result: BridgeTransferResult;

        if (bridgeTransferStartData.transferType === BridgeTransferType.CLAIM_COMMIT) {
            let trustClaimResult: Confirmed<TrustClaimTransaction> | undefined = undefined;
            if (bridgeTransferStartData.isTrustClaimRequired)
                trustClaimResult = await this.trustClaim(
                    bridgeForDestination,
                    destinationWallet as TrustClaimXChainWallet<
                        D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT
                    > /* `isTrustClaimRequired` ensures destination wallet is a `TrustClaimXChainWallet` */,
                );

            let trustCommitResult: Confirmed<TrustCommitTransaction> | undefined;
            if (bridgeTransferStartData.isTrustCommitRequired)
                trustCommitResult = await this.trustCommit(
                    bridgeForOrigin,
                    originWallet as TrustCommitXChainWallet<
                        D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT
                    > /* `isTrustCommitRequired` ensures origin wallet is a `TrustCommitXChainWallet` */,
                );

            const createClaimResult = await this.createClaim(bridgeForDestination, destinationWallet, originAddress);

            const commitResult = await this.commit(createClaimResult.claimId, bridgeForOrigin, originWallet, destinationAddress, amount);

            await this.awaitClaimAttestations(createClaimResult.claimId, bridgeForDestination, destinationWallet);

            result = {
                ...basicBridgeTransferResult,
                isCreateAccount: false,
                trustClaim: trustClaimResult,
                trustCommit: trustCommitResult,
                createClaim: createClaimResult,
                commit: commitResult,
            };
        } else {
            const createAccountCommitResult = await this.createAccountCommit(bridgeForOrigin, originWallet, destinationAddress, amount);

            await this.awaitCreateAccountCommitAttestations(bridgeForDestination, destinationWallet);

            result = {
                ...basicBridgeTransferResult,
                isCreateAccount: true,
                createAccountCommit: createAccountCommitResult,
            };
        }

        this.eventEmitter.emit("completed", result);

        return result;
    }

    /**
     * Performs a create bridge transaction
     * @param doorAddress The locking door address. Must match exactly one of the bridge doors (case sentitive).
     * @param tokenAddress The token address.
     * @param wallet The wallet to use.
     */
    async createBridgeRequest<T extends ChainType>(
        doorAddress: string,
        tokenAddress: XChainTokenFormat<T>,
        wallet: CreateBridgeRequestXChainWallet<T>,
    ): Promise<Confirmed<CreateBridgeRequestTransaction>> {
        let door: BridgeDoor;

        if (this.bridgeDoorPair.mainchainDoor.address === doorAddress) door = this.bridgeDoorPair.mainchainDoor;
        else if (this.bridgeDoorPair.sidechainDoor.address === doorAddress) door = this.bridgeDoorPair.sidechainDoor;
        else
            throw new BridgeManagerError(BridgeManagerErrors.DOOR_NOT_FOUND, {
                doorAddress,
            });

        if (wallet.type !== door.type)
            throw new BridgeManagerError(BridgeManagerErrors.WALLET_DOOR_TYPE_MISMATCH, {
                walletType: wallet.type,
                bridgeDoorType: door.type,
            });

        const issuingDoorAddress =
            this.bridgeDoorPair.mainchainDoor.address !== doorAddress
                ? new XChainAddress(this.bridgeDoorPair.mainchainDoor.address, this.bridgeDoorPair.mainchainDoor.type)
                : new XChainAddress(this.bridgeDoorPair.sidechainDoor.address, this.bridgeDoorPair.sidechainDoor.type);

        try {
            this.eventEmitter.emit("stage", BridgeTransferStage.CREATE_BRIDGE_REQUEST);
            this.eventEmitter.emit("createBridgeRequestRequested");
            const unconfirmedTx = await wallet.createBridgeRequest(doorAddress, tokenAddress, issuingDoorAddress.for(door.type));

            this.eventEmitter.emit("createBridgeRequestSigned", unconfirmedTx);
            const confirmedTx = await unconfirmedTx.wait();

            this.eventEmitter.emit("createBridgeRequestConfirmed", confirmedTx);

            // Refresh XChainBridges after new bridge is created and emit event
            confirmedTx.waitCreation().then(async (xChainBridge) => {
                await this.getXChainBridges({ refresh: true });
                this.eventEmitter.emit("createBridgeRequestBridgeCreated", xChainBridge);
            });

            return confirmedTx;
        } catch (error) {
            throw this.handleTransferError(error, BridgeTransferStage.CREATE_BRIDGE_REQUEST);
        }
    }
}
