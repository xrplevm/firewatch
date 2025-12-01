import { Bridge } from "../../../../../src/bridge/Bridge";
import { ClaimId } from "../../../../../src/bridge/utils";
import { BridgeDirection, ChainType } from "../../../../../src/common/types";
import { EvmXChainWallet } from "../../../../../src/wallet/wallets/evm";
import { EvmXChainWalletError, EvmXChainWalletErrors } from "../../../../../src/wallet/wallets/evm/errors/EvmXChainWallet.errors";
import { XChainAddress, XChainBridgeIssue } from "../../../../../src/xchain";
import { EvmXChainWalletProviderMock } from "../../../../mocks/wallet/wallets/evm/EvmXChainWalletProvider.mock";
import { EvmXChainWalletSignerMock } from "../../../../mocks/wallet/wallets/evm/EvmXChainWalletSigner.mock";
import { XChainBridgeMock } from "../../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../../mocks/xchain/XChainBridgeChain.mock";
import MethodMock from "../../../../utils/MethodMock";

describe("EvmXChainWallet", () => {
    const address = "0x1234";

    const evmXChainWalletProviderMock = new EvmXChainWalletProviderMock();
    const evmXChainWalletSignerMock = new EvmXChainWalletSignerMock({ getAddress: new MethodMock("mockResolvedValue", address) });

    beforeEach(() => {
        evmXChainWalletProviderMock.clearMocks();
        evmXChainWalletSignerMock.clearMocks();
    });

    describe("constructor", () => {
        test("Creates an EvmXChainWallet instance", () => {
            const evmXChainWallet = new EvmXChainWallet(evmXChainWalletProviderMock, evmXChainWalletSignerMock);

            expect(evmXChainWallet).toBeDefined();
        });
    });

    describe("instance", () => {
        let evmXChainWallet: EvmXChainWallet;

        const nativeXChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({ type: ChainType.EVM, issue: new XChainBridgeIssue<ChainType.EVM>("XRP") }),
            issuingChain: new XChainBridgeChainMock({ type: ChainType.EVM, issue: new XChainBridgeIssue<ChainType.EVM>("XRP") }),
        });
        const nativeBridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, nativeXChainBridge);
        const nativeBridgeForOrigin = nativeBridge.forOrigin();
        const tokenXChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({
                type: ChainType.EVM,
                issue: new XChainBridgeIssue("USD", new XChainAddress("0x7A2F9F87cc9AC2339081D2D3BbcB1f3e8F043Bd9", ChainType.EVM)),
            }),
            issuingChain: new XChainBridgeChainMock({
                type: ChainType.EVM,
                issue: new XChainBridgeIssue("USD", new XChainAddress("0x7A2F9F87cc9AC2339081D2D3BbcB1f3e8F043Bd9", ChainType.EVM)),
            }),
        });
        const tokenBridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, tokenXChainBridge);
        const tokenBridgeForOrigin = tokenBridge.forOrigin();
        const tokenBridgeForDestination = tokenBridge.forDestination();

        beforeEach(() => {
            evmXChainWallet = new EvmXChainWallet(evmXChainWalletProviderMock, evmXChainWalletSignerMock);
        });

        describe("getAddress", () => {
            test("Gets address", async () => {
                const res = await evmXChainWallet.getAddress();

                expect(res).toEqual(address);
            });
        });

        describe("isActive", () => {
            test("Returns true if wallet account is active", async () => {
                evmXChainWalletProviderMock.isAccountActive.mockResolvedValueOnce(true);

                const isActive = await evmXChainWallet.isActive();

                expect(isActive).toEqual(true);
            });

            test("Returns false if wallet account is not active", async () => {
                evmXChainWalletProviderMock.isAccountActive.mockResolvedValueOnce(false);

                const isActive = await evmXChainWallet.isActive();

                expect(isActive).toEqual(false);
            });
        });

        describe("getBalance", () => {
            test("Returns the wallet balance", async () => {
                const balanceMock = "1000000000000000000000";
                evmXChainWalletProviderMock.getNativeBalance.mockResolvedValueOnce(balanceMock);

                const balance = await evmXChainWallet.getBalance();

                expect(balance).toEqual(balanceMock);
            });
        });

        describe("isTrustCommitRequired", () => {
            test("Returns false if bridge is native", () => {
                expect(evmXChainWallet.isTrustCommitRequired(nativeBridgeForOrigin)).toEqual(false);
            });

            test("Returns true if bridge is not native", () => {
                expect(evmXChainWallet.isTrustCommitRequired(tokenBridgeForOrigin)).toEqual(true);
            });
        });

        describe("trustCommit", () => {
            test("Calls evmXChainWalletSigner.approveBridgeTokenContract correctly", async () => {
                await evmXChainWallet.trustCommit(tokenBridgeForOrigin);

                expect(evmXChainWalletSignerMock.approveBridgeTokenContract).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletSignerMock.approveBridgeTokenContract).toHaveBeenCalledWith(tokenBridgeForOrigin);
            });

            test("Throws CANNOT_TRUST_COMMIT_WITH_NATIVE_TOKEN", async () => {
                expect(async () => await evmXChainWallet.trustCommit(nativeBridgeForOrigin)).rejects.toThrow(
                    new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_TRUST_COMMIT_WITH_NATIVE_TOKEN),
                );
            });
        });

        describe("isCommitTrusted", () => {
            test("Calls evmXChainWalletProvider.isBridgeTokenContractApproved correctly", async () => {
                await evmXChainWallet.isCommitTrusted(tokenBridgeForOrigin);

                expect(evmXChainWalletProviderMock.isBridgeTokenContractApproved).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletProviderMock.isBridgeTokenContractApproved).toHaveBeenCalledWith(address, tokenBridgeForOrigin);
            });

            test("Throws CANNOT_CHECK_COMMIT_TRUST_WITH_NATIVE_TOKEN", async () => {
                expect(async () => await evmXChainWallet.isCommitTrusted(nativeBridgeForOrigin)).rejects.toThrow(
                    new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_CHECK_COMMIT_TRUST_WITH_NATIVE_TOKEN),
                );
            });
        });

        describe("createClaim", () => {
            const originAddress = "0x1234";

            test("Calls evmXChainWalletSigner.createClaim correctly", async () => {
                await evmXChainWallet.createClaim(originAddress, tokenBridgeForDestination);

                expect(evmXChainWalletSignerMock.createClaim).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletSignerMock.createClaim).toHaveBeenCalledWith(originAddress, tokenBridgeForDestination);
            });
        });

        describe("commit", () => {
            const claimId = ClaimId.fromInt(1);
            const destinationAddress = "0x5678";
            const amount = "100";

            test("Calls evmXChainWalletSigner.commit correctly", async () => {
                await evmXChainWallet.commit(claimId, destinationAddress, tokenBridgeForOrigin, amount);

                expect(evmXChainWalletSignerMock.commit).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletSignerMock.commit).toHaveBeenCalledWith(claimId, destinationAddress, tokenBridgeForOrigin, amount);
            });
        });

        describe("createAccountCommit", () => {
            const destinationAddress = "0x5678";
            const amount = "100";

            test("Calls evmXChainWalletSigner.createAccountCommit correctly", async () => {
                await evmXChainWallet.createAccountCommit(destinationAddress, nativeBridgeForOrigin, amount);

                expect(evmXChainWalletSignerMock.createAccountCommit).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletSignerMock.createAccountCommit).toHaveBeenCalledWith(
                    destinationAddress,
                    nativeBridgeForOrigin,
                    amount,
                );
            });

            test("Throws CANNOT_CREATE_ACCOUNT_WITH_TOKENS error", async () => {
                expect(
                    async () => await evmXChainWallet.createAccountCommit(destinationAddress, tokenBridgeForOrigin, amount),
                ).rejects.toThrow(new EvmXChainWalletError(EvmXChainWalletErrors.CANNOT_CREATE_ACCOUNT_WITH_TOKENS));
            });
        });

        describe("isClaimAttested", () => {
            const claimId = ClaimId.fromInt(1);

            test("Calls evmXChainWalletProvider.isClaimAttested correctly", async () => {
                await evmXChainWallet.isClaimAttested(claimId, tokenBridgeForDestination);

                expect(evmXChainWalletProviderMock.isClaimAttested).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletProviderMock.isClaimAttested).toHaveBeenCalledWith(address, claimId, tokenBridgeForDestination);
            });
        });

        describe("isCreateAccountCommitAttested", () => {
            test("Calls evmXChainWalletProvider.isCreateAccountCommitAttested correctly", async () => {
                await evmXChainWallet.isCreateAccountCommitAttested();

                expect(evmXChainWalletProviderMock.isCreateAccountCommitAttested).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletProviderMock.isCreateAccountCommitAttested).toHaveBeenCalledWith(address);
            });
        });

        describe("createBridgeRequest", () => {
            test("Calls evmXChainWalletSigner.createBridgeRequest correctly", async () => {
                const doorAddress = "doorAddress";
                const tokenAddress = "tokenAddress";
                const issuingDoorAddress = "issuingDoorAddress";

                await evmXChainWallet.createBridgeRequest(doorAddress, tokenAddress, issuingDoorAddress);

                expect(evmXChainWalletSignerMock.createBridgeRequest).toHaveBeenCalledTimes(1);
                expect(evmXChainWalletSignerMock.createBridgeRequest).toHaveBeenCalledWith(doorAddress, tokenAddress, issuingDoorAddress);
            });
        });
    });
});
