import { EventEmitter } from "../../../common/utils/event";
import {
    CommitTransaction,
    Confirmed,
    CreateAccountCommitTransaction,
    CreateBridgeRequestTransaction,
    CreateClaimTransaction,
    TrustClaimTransaction,
    TrustCommitTransaction,
    Unconfirmed,
} from "../../../transaction/types";
import { PartialXChainBridge } from "../../../xchain";
import { BridgeTransferStartData, BridgeTransferStage, BridgeTransferResult } from "../BridgeManager.types";

export type BridgeManagerEvents = {
    trustClaimRequested: () => void;
    trustClaimSigned: (unconfirmedTrustClaimTransaction: Unconfirmed<TrustClaimTransaction>) => void;
    trustClaimConfirmed: (confirmedTrustClaimTransaction?: Confirmed<TrustClaimTransaction>) => void;
    trustClaimFailed: (error: any) => void;
    trustCommitRequested: () => void;
    trustCommitSigned: (unconfirmedTrustCommitTransaction: Unconfirmed<TrustCommitTransaction>) => void;
    trustCommitConfirmed: (confirmedTrustCommitTransaction?: Confirmed<TrustCommitTransaction>) => void;
    trustCommitFailed: (error: any) => void;
    createClaimRequested: () => void;
    createClaimSigned: (unconfirmedCreateClaimTransaction: Unconfirmed<CreateClaimTransaction>) => void;
    createClaimConfirmed: (confirmedCreateClaimTransaction: Confirmed<CreateClaimTransaction>) => void;
    createClaimFailed: (error: any) => void;
    commitRequested: () => void;
    commitSigned: (unconfirmedCommitTransaction: Unconfirmed<CommitTransaction>) => void;
    commitConfirmed: (confirmedCommitTransaction: Confirmed<CommitTransaction>) => void;
    commitFailed: (error: any) => void;
    createAccountCommitRequested: () => void;
    createAccountCommitSigned: (unconfirmedCreateAccountCommitTransaction: Unconfirmed<CreateAccountCommitTransaction>) => void;
    createAccountCommitConfirmed: (confirmedCreateAccountCommitTransaction: Confirmed<CreateAccountCommitTransaction>) => void;
    createAccountCommitFailed: (error: any) => void;
    attestationsStarted: () => void;
    attestationsCompleted: () => void;
    attestationsFailed: (error: any) => void;
    createBridgeRequestRequested: () => void;
    createBridgeRequestSigned: (unconfirmedCreateBridgeRequestTransaction: Unconfirmed<CreateBridgeRequestTransaction>) => void;
    createBridgeRequestConfirmed: (confirmedCreateBridgeRequestTransaction: Confirmed<CreateBridgeRequestTransaction>) => void;
    createBridgeRequestBridgeCreated: (xChainBridge: PartialXChainBridge) => void;
    createBridgeRequestFailed: (error: any) => void;
    start: (data: BridgeTransferStartData) => void;
    stage: (stage: BridgeTransferStage) => void;
    completed: (result: BridgeTransferResult) => void;
    failed: (error: any) => void;
};

export class BridgeManagerEventEmitter extends EventEmitter<BridgeManagerEvents> {}
