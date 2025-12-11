/**
 * Checks if a call is disabled by the given disabled calls.
 * @param call The call to check.
 * @param disabledCalls The disabled calls.
 * @returns Whether the call is disabled.
 */
export function isDisabledCall(call: string, disabledCalls: string[]): boolean {
    return disabledCalls.includes(call);
}
