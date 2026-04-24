import { stringToPath } from "@cosmjs/crypto";
import { MsgSubmitProposal, MsgSubmitProposalResponse, MsgVote } from "cosmjs-types/cosmos/gov/v1/tx";
import { QueryProposalRequest, QueryProposalResponse } from "cosmjs-types/cosmos/gov/v1/query";
import { ProposalStatus, VoteOption } from "cosmjs-types/cosmos/gov/v1/gov";
import { Any } from "cosmjs-types/google/protobuf/any";
import { DirectSecp256k1HdWallet, EthermintSigningClient } from "../ethermint";

export { ProposalStatus } from "cosmjs-types/cosmos/gov/v1/gov";

const ETHEREUM_HD_PATH = "m/44'/60'/0'/0/0";
const SUBMIT_PROPOSAL_GAS = "500000";
const VOTE_GAS = "200000";
const PROPOSAL_POLL_INTERVAL_MS = 2_000;
const PROPOSAL_DEFAULT_TIMEOUT_MS = 30_000;

export type SubmitAndVoteParams = {
    rpcUrl: string;
    mnemonic: string;
    prefix: string;
    denom: string;
    message: Any;
    title: string;
    summary: string;
    depositAmount: string;
    timeoutMs?: number;
};

/**
 * Sleep for the given duration.
 * @param ms Duration in milliseconds.
 */
async function sleep(ms: number): Promise<void> {
    await new Promise((resolvePromise) => {
        setTimeout(resolvePromise, ms);
    });
}

/**
 * Poll the chain until a proposal reaches a terminal status (>= PASSED).
 * @param client Connected Ethermint signing client.
 * @param proposalId Proposal identifier.
 * @param timeoutMs Timeout in milliseconds.
 * @returns The terminal proposal status code.
 */
async function waitForProposal(client: EthermintSigningClient, proposalId: bigint, timeoutMs: number): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    const request = QueryProposalRequest.encode(QueryProposalRequest.fromPartial({ proposalId })).finish();

    while (Date.now() < deadline) {
        const value = await client.queryAbci("/cosmos.gov.v1.Query/Proposal", request);
        if (value.length > 0) {
            const { proposal } = QueryProposalResponse.decode(value);
            const status = proposal ? Number(proposal.status) : undefined;
            if (typeof status === "number" && status >= ProposalStatus.PROPOSAL_STATUS_PASSED) {
                return status;
            }
        }

        await sleep(PROPOSAL_POLL_INTERVAL_MS);
    }

    throw new Error(`Proposal ${proposalId} did not reach terminal state within ${timeoutMs}ms`);
}

/**
 * Submit a single-message governance proposal, vote YES from the same sender, and wait for a terminal status.
 *
 * The `depositAmount` must be >= the chain's `min_deposit` (gov params), otherwise the proposal stays
 * in deposit period and `waitForProposal` times out.
 * @param params Submit-and-vote parameters.
 * @returns Proposal id and terminal status.
 */
export async function submitAndVote(params: SubmitAndVoteParams): Promise<{ proposalId: string; status: number }> {
    const { rpcUrl, mnemonic, prefix, denom, message, title, summary, depositAmount, timeoutMs = PROPOSAL_DEFAULT_TIMEOUT_MS } = params;

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix,
        hdPaths: [stringToPath(ETHEREUM_HD_PATH)],
    });
    const client = await EthermintSigningClient.connectWithSigner(rpcUrl, wallet);

    try {
        const [{ address: sender }] = await wallet.getAccounts();

        const submitResult = await client.signAndBroadcast(
            sender,
            [
                {
                    typeUrl: "/cosmos.gov.v1.MsgSubmitProposal",
                    value: MsgSubmitProposal.fromPartial({
                        messages: [message],
                        initialDeposit: [{ denom, amount: depositAmount }],
                        proposer: sender,
                        metadata: "",
                        title,
                        summary,
                    }),
                },
            ],
            { amount: [{ denom, amount: "1" }], gas: SUBMIT_PROPOSAL_GAS },
        );
        if (submitResult.code !== 0) {
            throw new Error(`Submit proposal failed: ${submitResult.rawLog ?? `code=${submitResult.code}`}`);
        }

        const [msgResponse] = submitResult.msgResponses;
        if (!msgResponse) {
            throw new Error("MsgSubmitProposalResponse missing from submit result");
        }
        const proposalId = MsgSubmitProposalResponse.decode(msgResponse.value).proposalId;

        const voteResult = await client.signAndBroadcast(
            sender,
            [
                {
                    typeUrl: "/cosmos.gov.v1.MsgVote",
                    value: MsgVote.fromPartial({
                        proposalId,
                        voter: sender,
                        option: VoteOption.VOTE_OPTION_YES,
                        metadata: "",
                    }),
                },
            ],
            { amount: [{ denom, amount: "1" }], gas: VOTE_GAS },
        );
        if (voteResult.code !== 0) {
            throw new Error(`Vote failed: ${voteResult.rawLog ?? `code=${voteResult.code}`}`);
        }

        return {
            proposalId: proposalId.toString(),
            status: await waitForProposal(client, proposalId, timeoutMs),
        };
    } finally {
        client.disconnect();
    }
}
