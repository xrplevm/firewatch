import { ClaimId } from "../bridge/utils";
import { PartialXChainBridge } from "../xchain";

export type Transaction = {
    hash: string;
    confirmed: boolean;
};

export type Confirmed<T extends Transaction> = T & {
    confirmed: true;
};

export type Unconfirmed<T extends Transaction> = {
    hash: string;
    confirmed: false;
    wait: () => Promise<Confirmed<T>>;
};

export type TrustClaimTransaction = Transaction;

export type TrustCommitTransaction = Transaction;

export type CreateClaimTransaction = Transaction & {
    claimId: ClaimId;
};

export type CommitTransaction = Transaction;

export type CreateAccountCommitTransaction = Transaction;

export type CreateBridgeRequestTransaction = Transaction & { waitCreation: () => Promise<PartialXChainBridge> };
