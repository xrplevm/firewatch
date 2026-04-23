import { expect } from "chai";
import { toBech32, fromHex } from "@cosmjs/encoding";
import { abciQuery } from "@firewatch/cosmos/query";
import { QueryOwnerAddressesRequest, QueryOwnerAddressesResponse, QueryTokenPairRequest, QueryTokenPairResponse, TokenPair } from "./proto";

export type CosmosConfig = {
    rpcUrl: string;
    mnemonic: string;
    denom: string;
    prefix: string;
    govModuleAddress: string;
};

/**
 * Extract the cosmos section from a module config.
 * @param moduleConfig Imported module.config.json.
 * @returns Cosmos config.
 */
export function getCosmosConfig(moduleConfig: { cosmos: CosmosConfig }): CosmosConfig {
    return moduleConfig.cosmos;
}

/**
 * Convert a 0x-prefixed hex address to bech32.
 * @param prefix Bech32 HRP.
 * @param hex Hex address with or without `0x` prefix.
 * @returns Bech32-encoded address.
 */
export function hexToBech32(prefix: string, hex: string): string {
    const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
    return toBech32(prefix, fromHex(stripped));
}

/**
 * Query authorized minters for a token pair.
 * @param rpcUrl Comet RPC endpoint.
 * @param token ERC-20 contract address or cosmos denom.
 * @returns Bech32 minter addresses, empty array if none or pair unknown.
 */
export async function queryOwnerAddresses(rpcUrl: string, token: string): Promise<string[]> {
    const value = await abciQuery(
        rpcUrl,
        "/cosmos.evm.erc20.v1.Query/OwnerAddresses",
        QueryOwnerAddressesRequest.encode({ contractAddress: token }).finish(),
    );
    if (value.length === 0) {
        return [];
    }

    return QueryOwnerAddressesResponse.decode(value).ownerAddresses;
}

/**
 * Query token pair metadata.
 * @param rpcUrl Comet RPC endpoint.
 * @param token ERC-20 contract address or cosmos denom.
 * @returns Decoded TokenPair.
 * @throws If pair is not registered.
 */
export async function queryTokenPair(rpcUrl: string, token: string): Promise<TokenPair> {
    const value = await abciQuery(rpcUrl, "/cosmos.evm.erc20.v1.Query/TokenPair", QueryTokenPairRequest.encode({ token }).finish());
    if (value.length === 0) {
        throw new Error(`TokenPair not found for token '${token}'`);
    }

    const { tokenPair } = QueryTokenPairResponse.decode(value);
    if (!tokenPair) {
        throw new Error(`TokenPair missing in response for token '${token}'`);
    }

    return tokenPair;
}

/**
 * Assert both contract-address and denom queries return the same ordered minter set.
 * @param rpcUrl Comet RPC endpoint.
 * @param contractAddress ERC-20 contract address.
 * @param denom Cosmos denom for the same token pair.
 * @param expected Expected bech32 minters in order.
 */
export async function expectOwnerAddresses(rpcUrl: string, contractAddress: string, denom: string, expected: string[]): Promise<void> {
    const ownersByContract = await queryOwnerAddresses(rpcUrl, contractAddress);
    const ownersByDenom = await queryOwnerAddresses(rpcUrl, denom);

    expect(ownersByContract).to.have.ordered.members(expected);
    expect(ownersByDenom).to.have.ordered.members(expected);
}

/**
 * Assert TokenPair queries by contract and denom return `ownerAddresses` in the expected order,
 * and that deprecated `ownerAddress` matches `ownerAddresses[0]` (empty string if none).
 *
 * Ordered: deprecated `ownerAddress` is defined as `ownerAddresses[0]`, so a keeper re-order
 * would pass set-equality while `ownerAddress` silently points at a different minter.
 * @param rpcUrl Comet RPC endpoint.
 * @param contractAddress ERC-20 contract address.
 * @param denom Cosmos denom for the same token pair.
 * @param expected Expected bech32 minters in order.
 */
export async function expectTokenPairOwnerAddresses(
    rpcUrl: string,
    contractAddress: string,
    denom: string,
    expected: string[],
): Promise<void> {
    const pairByContract = await queryTokenPair(rpcUrl, contractAddress);
    const pairByDenom = await queryTokenPair(rpcUrl, denom);

    expect(pairByContract.ownerAddresses).to.have.ordered.members(expected);
    expect(pairByDenom.ownerAddresses).to.have.ordered.members(expected);

    const expectedDeprecated = expected.length > 0 ? expected[0] : "";
    expect(pairByContract.ownerAddress).to.equal(expectedDeprecated);
    expect(pairByDenom.ownerAddress).to.equal(expectedDeprecated);
}
