import {
    QueryClientImpl as SlashingQueryClient,
    QueryParamsResponse as SlashingParamsResponse,
} from "cosmjs-types/cosmos/slashing/v1beta1/query";
import { BaseQueryClient } from "../base-query-client";
import { fromUtf8 } from "@cosmjs/encoding";

export class SlashingClient {
    public readonly slashingQuery: SlashingQueryClient;

    private constructor(slashingQuery: SlashingQueryClient) {
        this.slashingQuery = slashingQuery;
    }

    /**
     * Static async factory method to create a SlashingClient instance.
     * @param rpcUrl - The Tendermint RPC endpoint URL.
     * @returns A Promise that resolves to a fully initialized SlashingClient.
     */
    static async connect(rpcUrl: string): Promise<SlashingClient> {
        const baseClient = await BaseQueryClient.connect(rpcUrl);
        const slashingQuery = new SlashingQueryClient(baseClient.rpcClient);
        return new SlashingClient(slashingQuery);
    }

    /**
     * Retrieves the slashing module parameters.
     * @returns A Promise that resolves to the slashing parameters response.
     */
    async getParams(): Promise<SlashingParamsResponse> {
        return await this.slashingQuery.Params({});
    }

    /**
     * Retrieves the slash fraction for double signing as a string.
     * It calls getParams and decodes the Uint8Array returned for slashFractionDoubleSign.
     * @returns A promise that resolves to the double-sign slash fraction as a string.
     */
    async getSlashFractionDoubleSignAsString(): Promise<string> {
        const paramsResponse = await this.getParams();
        if (paramsResponse.params && paramsResponse.params.slashFractionDoubleSign) {
            return fromUtf8(paramsResponse.params.slashFractionDoubleSign);
        }
        return "";
    }

    /**
     * Retrieves the slash fraction for downtime as a string.
     * It calls getParams and decodes the Uint8Array returned for slashFractionDowntime.
     * @returns A promise that resolves to the downtime slash fraction as a string.
     */
    async getSlashFractionDowntimeAsString(): Promise<string> {
        const paramsResponse = await this.getParams();
        if (paramsResponse.params && paramsResponse.params.slashFractionDowntime) {
            return fromUtf8(paramsResponse.params.slashFractionDowntime);
        }
        return "";
    }
}
