import {
    CommitTransaction,
    Confirmed,
    CreateAccountCommitTransaction,
    CreateClaimTransaction,
    TrustClaimTransaction,
    TrustCommitTransaction,
} from "../../transaction/types";
import { XChainBridgeChain } from "../../xchain";

export enum BridgeTransferType {
    CLAIM_COMMIT = "claim/commit",
    CREATE_ACCOUNT = "createAccount",
}

export type BridgeTransferStartData = { amount: string } & (
    | {
          transferType: BridgeTransferType.CLAIM_COMMIT;
          isTrustClaimRequired: boolean;
          isTrustCommitRequired: boolean;
      }
    | { transferType: BridgeTransferType.CREATE_ACCOUNT }
);

export enum BridgeTransferStage {
    TRUST_CLAIM = "trustClaim",
    TRUST_COMMIT = "trustCommit",
    CREATE_CLAIM = "createClaim",
    COMMIT = "commit",
    CREATE_ACCOUNT_COMMIT = "createAccountCommit",
    ATTESTATIONS = "attestations",
    CREATE_BRIDGE_REQUEST = "createBridgeRequest",
}

export type BasicBridgeTransferResult = {
    amount: string;
    originAddress: string;
    destinationAddress: string;
    originXChainBridgeChain: XChainBridgeChain;
    destinationXChainBridgeChain: XChainBridgeChain;
};

export interface GetXChainBridgesOptions {
    refresh?: boolean;
}

export type BridgeTransferResult = BasicBridgeTransferResult &
    (
        | {
              isCreateAccount: false;
              trustClaim?: Confirmed<TrustClaimTransaction>;
              trustCommit?: Confirmed<TrustCommitTransaction>;
              createClaim: Confirmed<CreateClaimTransaction>;
              commit: Confirmed<CommitTransaction>;
          }
        | {
              isCreateAccount: true;
              createAccountCommit: Confirmed<CreateAccountCommitTransaction>;
          }
    );
