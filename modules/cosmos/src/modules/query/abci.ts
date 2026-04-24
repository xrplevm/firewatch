import { connectComet } from "@cosmjs/tendermint-rpc";

/**
 * Open a Comet RPC connection, run the callback, and disconnect. Use for
 * batching multiple ABCI queries against the same connection.
 * @param rpcUrl Comet RPC endpoint.
 * @param fn Callback receiving a bound `(path, data)` query function.
 * @returns The callback's return value.
 */
export async function withComet<T>(
    rpcUrl: string,
    fn: (query: (path: string, data: Uint8Array) => Promise<Uint8Array>) => Promise<T>,
): Promise<T> {
    const client = await connectComet(rpcUrl);
    try {
        return await fn(async (path, data) => {
            const { value } = await client.abciQuery({ path, data });
            return value ?? new Uint8Array();
        });
    } finally {
        client.disconnect();
    }
}

/**
 * Run a one-shot ABCI query against a Comet RPC endpoint. Opens a connection,
 * issues the query, and disconnects. For repeated queries use `withComet`.
 * @param rpcUrl Comet RPC endpoint.
 * @param path ABCI query path (e.g. "/cosmos.gov.v1.Query/Proposal").
 * @param data Encoded request bytes.
 * @returns Raw response value bytes (empty if the response had none).
 */
export async function abciQuery(rpcUrl: string, path: string, data: Uint8Array): Promise<Uint8Array> {
    return withComet(rpcUrl, (query) => query(path, data));
}
