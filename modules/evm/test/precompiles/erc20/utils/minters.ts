import { expect } from "chai";
import { Any } from "cosmjs-types/google/protobuf/any";
import { ProposalStatus, submitAndVote } from "@firewatch/cosmos/gov";
import { CosmosConfig, expectOwnerAddresses, queryOwnerAddresses } from "./cosmos";
import { MsgAddMinter, MsgRemoveMinter } from "./proto";

export type ProposalOptions = {
    timeoutMs?: number;
};

/**
 * Add a minter to the token pair via a governance proposal.
 * @param config Cosmos runtime configuration.
 * @param token ERC-20 contract address or cosmos denom identifying the token pair.
 * @param minterAddress Bech32 address to authorize.
 * @param options Optional proposal overrides (e.g. `timeoutMs`).
 * @returns Proposal id and terminal status.
 */
export async function addMinter(
    config: CosmosConfig,
    token: string,
    minterAddress: string,
    options: ProposalOptions = {},
): Promise<{ proposalId: string; status: number }> {
    return submitAndVote({
        rpcUrl: config.rpcUrl,
        mnemonic: config.mnemonic,
        prefix: config.prefix,
        denom: config.denom,
        message: Any.fromPartial({
            typeUrl: MsgAddMinter.typeUrl,
            value: MsgAddMinter.encode({ authority: config.govModuleAddress, token, minterAddress }).finish(),
        }),
        title: "Add Minter",
        summary: `Add ${minterAddress} as minter for ${token}`,
        depositAmount: "1",
        timeoutMs: options.timeoutMs,
    });
}

/**
 * Remove a minter from the token pair via a governance proposal.
 * @param config Cosmos runtime configuration.
 * @param token ERC-20 contract address or cosmos denom identifying the token pair.
 * @param minterAddress Bech32 address to revoke.
 * @param options Optional proposal overrides (e.g. `timeoutMs`).
 * @returns Proposal id and terminal status.
 */
export async function removeMinter(
    config: CosmosConfig,
    token: string,
    minterAddress: string,
    options: ProposalOptions = {},
): Promise<{ proposalId: string; status: number }> {
    return submitAndVote({
        rpcUrl: config.rpcUrl,
        mnemonic: config.mnemonic,
        prefix: config.prefix,
        denom: config.denom,
        message: Any.fromPartial({
            typeUrl: MsgRemoveMinter.typeUrl,
            value: MsgRemoveMinter.encode({ authority: config.govModuleAddress, token, minterAddress }).finish(),
        }),
        title: "Remove Minter",
        summary: `Remove ${minterAddress} as minter for ${token}`,
        depositAmount: "1",
        timeoutMs: options.timeoutMs,
    });
}

/**
 * Removes every authorized minter except `ownerBech32` via governance, then asserts the
 * owner is the sole minter registered under both the denom and the contract-address queries.
 * Used as a baseline between tests to isolate minter-set assertions.
 * @param config Cosmos runtime configuration.
 * @param contractAddress ERC-20 contract address of the token pair.
 * @param ownerBech32 Bech32 address of the genesis minter that must remain authorized.
 */
export async function ensureOwnerOnlyMinter(config: CosmosConfig, contractAddress: string, ownerBech32: string): Promise<void> {
    const [ownersByDenom, ownersByContract] = await Promise.all([
        queryOwnerAddresses(config.rpcUrl, config.denom),
        queryOwnerAddresses(config.rpcUrl, contractAddress),
    ]);
    const rogueOwners = Array.from(new Set([...ownersByDenom, ...ownersByContract])).filter((address) => address !== ownerBech32);

    for (const rogue of rogueOwners) {
        const { status } = await removeMinter(config, config.denom, rogue);
        expect(status, `cleanup removeMinter(${rogue})`).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
    }

    await expectOwnerAddresses(config.rpcUrl, contractAddress, config.denom, [ownerBech32]);
}
