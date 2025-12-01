import { AddressOne, AddressTwo, AddressZero } from "../core/constants";
import { CreateBridgeFixture } from "./types";

export const ValidCreateBridgeFixtures: CreateBridgeFixture[] = [
    {
        params: {
            replaceSafeAddress: "0xB5f762798A53d543a014CAf8b297CFF8F2F937e8",
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: safe,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 0,
                signatureReward: 1,
            },
        },
    },
    {
        params: {
            config: (safe: string, tokenAddress: string) => ({
                lockingChainDoor: safe,
                lockingChainIssue: {
                    issuer: tokenAddress,
                    currency: "TOKEN",
                },
                issuingChainDoor: AddressTwo,
                issuingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 0,
                signatureReward: 1,
            },
        },
    },
];

export const CreateBridgeFixtures: CreateBridgeFixture[] = [
    ...ValidCreateBridgeFixtures,
    // Native -> Native
    {
        params: {
            replaceSafeAddress: "0xB5f762798A53d543a014CAf8b297CFF8F2F937e8",
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 0,
                signatureReward: 1,
            },
        },
        error: "minAccountCreateAmount must be greater than 0",
    },
    {
        params: {
            config: () => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: AddressOne,
                issuingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Bridge is not lockingChain nor issuingChain",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressTwo,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Native locking bridge must have lockingChainIssue.issuer set to address(0)",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressTwo,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Native issuing bridge must have issuingChainIssue.issuer set to address(0)",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Native issuing bridge door account must be 0xB5f762798A53d543a014CAf8b297CFF8F2F937e8",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressZero,
                    currency: "XRP",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Token bridge issuingChainDoor must be equal to issuingChainIssue.issuer",
    },
    // Token -> Token
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressOne,
                    currency: "TOKEN",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: safe,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: lockingChainIssue.issuer must be different than lockingChainDoor",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: safe,
                    currency: "XRP",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Issuing chain issue can't be Native if locking chain is Token",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Token bridge issuingChainDoor must be equal to issuingChainIssue.issuer",
    },
    {
        params: {
            config: (safe: string, tokenAddress: string) => ({
                lockingChainDoor: safe,
                lockingChainIssue: {
                    issuer: tokenAddress,
                    currency: "INVALID_TOKEN_NAME",
                },
                issuingChainDoor: AddressOne,
                issuingChainIssue: {
                    issuer: AddressOne,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 1,
                signatureReward: 1,
            },
        },
        error: "Invalid bridge config: Token bridge lockingChainIssue.currency must be the same as the ERC20 symbol",
    },
    {
        params: {
            config: (safe: string) => ({
                lockingChainDoor: AddressOne,
                lockingChainIssue: {
                    issuer: AddressTwo,
                    currency: "TOKEN",
                },
                issuingChainDoor: safe,
                issuingChainIssue: {
                    issuer: safe,
                    currency: "TOKEN",
                },
            }),
            params: {
                minCreateAmount: 10,
                signatureReward: 1,
            },
        },
        error: "minCreateAmount must be 0 for token bridges",
    },
];
