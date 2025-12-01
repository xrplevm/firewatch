import { AddressOne, AddressTwo, AddressZero } from "./constants";
import { BridgeConfig, ChainRole, Fixture } from "./types";

const witnessDistributions: Omit<Fixture, "config" | "role">[] = [
    { witnessNumber: 1, threshold: 1, reward: 300, minAccountCreateAmount: 1 },
    { witnessNumber: 3, threshold: 2, reward: 100, minAccountCreateAmount: 10 },
    { witnessNumber: 4, threshold: 2, reward: 100, minAccountCreateAmount: 100 },
    { witnessNumber: 3, threshold: 3, reward: 0, minAccountCreateAmount: 1000 },
];

const bridgeConfigs: { config: (safeAddress: string, tokenAddress?: string) => BridgeConfig; role: ChainRole }[] = [
    {
        // Native -> Native issuing bridge
        role: ChainRole.ISSUING,
        config: (safeAddress: string) => ({
            lockingChainDoor: AddressOne,
            lockingChainIssue: {
                issuer: AddressZero,
                currency: "XRP",
            },
            issuingChainDoor: safeAddress,
            issuingChainIssue: {
                issuer: AddressZero,
                currency: "XRP",
            },
        }),
    },
    {
        // Token -> Token issuing bridge
        role: ChainRole.ISSUING,
        config: (safeAddress: string) => ({
            lockingChainDoor: AddressOne,
            lockingChainIssue: {
                issuer: AddressTwo,
                currency: "TOKEN",
            },
            issuingChainDoor: safeAddress,
            issuingChainIssue: {
                issuer: safeAddress,
                currency: "TOKEN",
            },
        }),
    },
    {
        // Token -> Token locking bridge
        role: ChainRole.LOCKING,
        config: (safeAddress: string, tokenAddress = "") => ({
            lockingChainDoor: safeAddress,
            lockingChainIssue: {
                issuer: tokenAddress,
                currency: "TOKEN",
            },
            issuingChainDoor: AddressOne,
            issuingChainIssue: {
                issuer: AddressOne,
                currency: "TOKEN",
            },
        }),
    },
];

export const fixtures = () => {
    const fixtures: Fixture[] = [];
    for (const bridgeConfig of bridgeConfigs) {
        for (const witnessDistribution of witnessDistributions) {
            fixtures.push({
                ...witnessDistribution,
                ...bridgeConfig,
            });
        }
    }
    return fixtures;
};
