import { Client, Wallet } from "xrpl";
import { XrplProvider } from "../xrpl.provider";
import { IXrplFaucetProvider } from "./interfaces/i-xrpl-faucet.provider";

export class XrplFaucetProvider extends XrplProvider implements IXrplFaucetProvider {
    private faucetUrl: URL;

    constructor(client: Client, faucetUrl: string) {
        super(client);

        this.faucetUrl = new URL(faucetUrl);
    }

    /**
     * Generates a funded wallet.
     * @returns The funded wallet.
     */
    async generateFundedWallet(): Promise<Wallet> {
        try {
            return (await this.xrplClient.fundWallet(undefined, { faucetHost: this.faucetUrl.host, faucetPath: this.faucetUrl.pathname }))
                .wallet;
        } catch (_e) {
            // Retry if failed. The service fails at first most of the time.
            return (await this.xrplClient.fundWallet(undefined, { faucetHost: this.faucetUrl.host, faucetPath: this.faucetUrl.pathname }))
                .wallet;
        }
    }
}
