import { PollingOptions } from "../../common/utils/promise";

export const ATTESTATIONS_POLLING_INTERVAL = 5000;
export const MAX_ATTESTATIONS_TRIES = 100;

export const ATTESTATIONS_POLLING_OPTIONS: PollingOptions = {
    delay: ATTESTATIONS_POLLING_INTERVAL,
    maxIterations: MAX_ATTESTATIONS_TRIES,
};
