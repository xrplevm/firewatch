import { Client } from "xrpl";

const AUTO_CONNECT_METHODS = [
    "request",
    "requestNextPage",
    "requestAll",
    "getServerInfo",
    "autofill",
    "submit",
    "submitAndWait",
    "prepareTransaction",
    "getXrpBalance",
    "getBalances",
    "getOrderbook",
    "getLedgerIndex",
    "fundWallet",
];

/**
 * Higher order function that returns a proxy for the client that will automatically connect if the method is one of the auto connect methods.
 * @param client The client to wrap.
 * @returns The auto connect client.
 */
export function withAutoConnect(client: Client): Client {
    return new Proxy(client, {
        get: (target, prop) => {
            if (AUTO_CONNECT_METHODS.includes(prop as string)) {
                return async (...args: any[]) => {
                    try {
                        // Ensure the client is connected
                        await target.connect();
                    } catch (_) {
                        // If a weird error occurs, disconnect and reconnect
                        await target.disconnect();
                        await target.connect();
                    }
                    return (target as any)[prop](...args);
                };
            } else {
                return (target as any)[prop];
            }
        },
    });
}
