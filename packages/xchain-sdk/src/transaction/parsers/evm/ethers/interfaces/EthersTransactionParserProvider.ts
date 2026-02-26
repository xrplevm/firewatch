import { PartialXChainBridge } from "../../../../../xchain";

export interface EthersTransactionParserProvider {
    /**
     * Given a locking door address, a token and the issuing door address finds the token bridge.
     * @param doorAddress The (locking) door address of the bridge.
     * @param token The token.
     * @param issuingDoorAddress The issuing door address in EVM format.
     */
    findTokenBridge(doorAddress: string, token: string, issuingDoorAddress: string): Promise<PartialXChainBridge | undefined>;
}
