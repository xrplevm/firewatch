import { AxelarGMPRecoveryAPI, AxelarRecoveryAPIConfig } from "@axelar-network/axelarjs-sdk";

export class PatchedRecoveryAPI extends AxelarGMPRecoveryAPI {
    private _overrideUrl?: string;

    constructor(config: AxelarRecoveryAPIConfig, overrideUrl?: string) {
        super(config);
        this._overrideUrl = overrideUrl;
    }

    /**
     * Returns the Axelar GMP API URL, using the override if provided.
     */
    public override get getAxelarGMPApiUrl(): string {
        return this._overrideUrl ?? super.getAxelarGMPApiUrl;
    }
}
