import { BridgeDoorMultiToken } from "@peersyst/xrp-evm-contracts";
import { ethers } from "ethers";
import { ProviderMock } from "../../../../../mocks/ethers/Provider.mock";
import { EthersXChainProvider } from "../../../../../../src/provider/providers/evm";
import { XChainBridgeMock } from "../../../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../../../mocks/xchain/XChainBridgeChain.mock";
import { BridgeDirection, ChainType } from "../../../../../../src/common/types";
import { Bridge } from "../../../../../../src/bridge/Bridge";
import { BridgeDoorMultiTokenMock } from "../../../../../mocks/xrp-evm-contracts/BridgeDoorMultiToken.mock";
import { BridgeTokenMock } from "../../../../../mocks/xrp-evm-contracts/BridgeToken.mock";
import { ClaimId } from "../../../../../../src/bridge/utils";
import { BridgeConfigStructMock } from "../../../../../mocks/xrp-evm-contracts/BridgeConfigStruct.mock";
import { BridgeParamsStructOutputMock } from "../../../../../mocks/xrp-evm-contracts/BridgeParamsStructOutput.mock";
import { PartialXChainBridge, XChainAddress, XChainBridgeIssue } from "../../../../../../src/xchain";

describe("EthersXChainProvider", () => {
    describe("constructor", () => {
        const providerMock = new ProviderMock();

        test("Creates an EthersXChainProvider instance", () => {
            const ethersXChainProvider = new EthersXChainProvider(providerMock);

            expect(ethersXChainProvider).toBeDefined();
        });
    });

    describe("instance", () => {
        let ethersXChainProvider: EthersXChainProvider;

        const providerMock = new ProviderMock();
        const address = "0x123";
        const xChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({ type: ChainType.EVM }),
            issuingChain: new XChainBridgeChainMock({ type: ChainType.EVM }),
        });
        const bridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, xChainBridge);
        const bridgeForDestination = bridge.forDestination();

        const bridgeContractMock = new BridgeDoorMultiTokenMock();
        const bridgeTokenContractMock = new BridgeTokenMock();

        let getBridgeContractMock: jest.SpyInstance;
        let getBridgeTokenContractMock: jest.SpyInstance;
        let getTokenContractMock: jest.SpyInstance;

        beforeEach(() => {
            providerMock.clearMocks();

            ethersXChainProvider = new EthersXChainProvider(providerMock);

            // Mock methods that get contract instances
            getBridgeContractMock = jest.spyOn(ethersXChainProvider as any, "getBridgeContract").mockResolvedValue(bridgeContractMock);
            getBridgeTokenContractMock = jest
                .spyOn(ethersXChainProvider as any, "getBridgeTokenContract")
                .mockReturnValue(bridgeTokenContractMock);
            getTokenContractMock = jest.spyOn(ethersXChainProvider as any, "getTokenContract").mockReturnValue(bridgeTokenContractMock);
        });

        afterEach(() => {
            getBridgeContractMock.mockClear();
            getBridgeTokenContractMock.mockClear();
        });

        describe("getNativeBalance", () => {
            test("Gets balance", async () => {
                const balance = "1000000000000000000";

                providerMock.getBalance.mockResolvedValueOnce(ethers.BigNumber.from(balance));

                const res = await ethersXChainProvider.getNativeBalance(address);

                expect(res).toEqual(balance);
            });
        });

        describe("getNonce", () => {
            test("Gets nonce", async () => {
                const nonce = 33;

                providerMock.getTransactionCount.mockResolvedValueOnce(nonce);

                const res = await ethersXChainProvider.getNonce(address);

                expect(res).toEqual(nonce);
            });
        });

        describe("isAccountActive", () => {
            test("Account is active", async () => {
                providerMock.getBalance.mockResolvedValueOnce(ethers.BigNumber.from("2"));
                providerMock.getTransactionCount.mockResolvedValueOnce(33);

                const res = await ethersXChainProvider.isAccountActive(address);

                expect(res).toEqual(true);
            });

            test("Account is not active", async () => {
                providerMock.getBalance.mockResolvedValueOnce(ethers.BigNumber.from("0"));
                providerMock.getTransactionCount.mockResolvedValueOnce(0);

                const res = await ethersXChainProvider.isAccountActive(address);

                expect(res).toEqual(false);
            });
        });

        describe("getBridgeTokenAddress", () => {
            const tokenContractAddress = "0x456789";

            beforeEach(() => {
                bridgeContractMock.getBridgeToken.mockResolvedValueOnce(tokenContractAddress);
            });

            test("Gets bridge token address with door address", async () => {
                const res = await ethersXChainProvider.getBridgeTokenAddress("0xD00R4DDR355", xChainBridge.forEvm());

                expect(res).toEqual(tokenContractAddress);
            });

            test("Gets bridge token address with bridge contract", async () => {
                const res = await ethersXChainProvider.getBridgeTokenAddress(
                    // Ts complaining about super class private methods not being implemented :/
                    bridgeContractMock as unknown as BridgeDoorMultiToken,
                    xChainBridge.forEvm(),
                );

                expect(res).toEqual(tokenContractAddress);
            });
        });

        describe("getBridgeTokenDecimals", () => {
            test("Gets bridge token decimals", async () => {
                const decimals = 18;

                bridgeTokenContractMock.decimals.mockResolvedValueOnce(decimals);

                const res = await ethersXChainProvider.getBridgeTokenDecimals("0xD00R4DDR355", xChainBridge.forEvm());

                expect(res).toEqual(decimals);
            });
        });

        describe("isBridgeTokenContractApproved", () => {
            test("Bridge token contract is approved", async () => {
                const allowedAmount = "1000000000000000000";

                bridgeTokenContractMock.allowance.mockResolvedValueOnce(ethers.BigNumber.from(allowedAmount));

                const res = await ethersXChainProvider.isBridgeTokenContractApproved(address, bridge);

                expect(res).toEqual(true);
            });

            test("Bridge token contract is not approved", async () => {
                const allowedAmount = "0";

                bridgeTokenContractMock.allowance.mockResolvedValueOnce(ethers.BigNumber.from(allowedAmount));

                const res = await ethersXChainProvider.isBridgeTokenContractApproved(address, bridge);

                expect(bridgeTokenContractMock.allowance).toHaveBeenCalledWith(address, bridgeContractMock.address);
                expect(res).toEqual(false);
            });
        });

        describe("isClaimAttested", () => {
            const claimId = new ClaimId("1");

            test("Claim is attested", async () => {
                // Mock private getEvents method to return an event with the claimId
                jest.spyOn(ethersXChainProvider as any, "getEvents").mockResolvedValueOnce([
                    { args: [undefined, ethers.BigNumber.from(claimId.int)] },
                ]);

                const res = await ethersXChainProvider.isClaimAttested(address, claimId, bridgeForDestination);

                expect(res).toEqual(true);
            });

            test("Claim is not attested", async () => {
                // Mock private getEvents method to return an event with a different claimId
                jest.spyOn(ethersXChainProvider as any, "getEvents").mockResolvedValueOnce([
                    { args: [undefined, ethers.BigNumber.from(claimId.int + 1)] },
                ]);

                const res = await ethersXChainProvider.isClaimAttested(address, claimId, bridgeForDestination);

                expect(res).toEqual(false);
            });
        });

        describe("isCreateAccountCommitAttested", () => {
            test("Create account commit is attested", async () => {
                // Mock isAccountActive method to return true
                jest.spyOn(ethersXChainProvider, "isAccountActive").mockResolvedValueOnce(true);

                const res = await ethersXChainProvider.isCreateAccountCommitAttested(address);

                expect(res).toEqual(true);
            });

            test("Create account commit is not attested", async () => {
                // Mock isAccountActive method to return false
                jest.spyOn(ethersXChainProvider, "isAccountActive").mockResolvedValueOnce(false);

                const res = await ethersXChainProvider.isCreateAccountCommitAttested(address);

                expect(res).toEqual(false);
            });
        });

        describe("getXChainBridges", () => {
            const doorAddress = "0x1234";
            const id = "id";
            const bridgeConfigStruct = new BridgeConfigStructMock();
            const bridgeParamsStructOutput = new BridgeParamsStructOutputMock();

            test("Gets XChainBridges", async () => {
                // First call
                bridgeContractMock.getBridgesPaginated.mockResolvedValueOnce({
                    configs: [bridgeConfigStruct],
                    params: [bridgeParamsStructOutput],
                });
                // Second call
                bridgeContractMock.getBridgesPaginated.mockResolvedValueOnce({
                    configs: [new BridgeConfigStructMock({ issuingChainDoor: ethers.constants.AddressZero })],
                    params: [],
                });

                const result = await ethersXChainProvider.getXChainBridges(doorAddress, id);

                expect(bridgeContractMock.getBridgesPaginated).toHaveBeenCalledTimes(2);
                expect(bridgeContractMock.getBridgesPaginated).toHaveBeenNthCalledWith(1, 0);
                expect(bridgeContractMock.getBridgesPaginated).toHaveBeenNthCalledWith(2, 1);
                expect(result).toEqual([
                    PartialXChainBridge.fromEvm(
                        doorAddress,
                        bridgeConfigStruct,
                        bridgeParamsStructOutput.signatureReward.toString(),
                        bridgeParamsStructOutput.minCreateAmount.toString(),
                        id,
                    ),
                ]);
            });
        });

        describe("isErc20Address", () => {
            test("Is erc20 address", async () => {
                const res = await ethersXChainProvider.isErc20Address("0xfF0d22C43C43c6d5d6D17a0109e6605AC7B26489");

                expect(res).toEqual(true);
            });

            test("Is not erc20 address", async () => {
                getTokenContractMock.mockImplementation(() => {
                    throw new Error("Not an ERC20 token");
                });
                const res = await ethersXChainProvider.isErc20Address("not_erc20_address");

                expect(res).toEqual(false);
            });
        });

        describe("tokenBridgeExists", () => {
            test("Token bridge exists", async () => {
                const lockingChainMock = new XChainBridgeChainMock({
                    type: ChainType.EVM,
                    issue: new XChainBridgeIssue("PER", new XChainAddress("perAddress", ChainType.EVM)),
                });
                const issuingDoorAddress = "issuingDoorAddress";
                ethersXChainProvider.getXChainBridges = jest.fn().mockResolvedValueOnce([
                    new XChainBridgeMock({
                        lockingChain: lockingChainMock,
                        issuingChain: new XChainBridgeChainMock({
                            type: ChainType.EVM,
                            doorAddress: new XChainAddress(issuingDoorAddress, ChainType.EVM),
                        }),
                    }),
                ]);

                const res = await ethersXChainProvider.tokenBridgeExists(
                    "0xD00R4DDR355",
                    lockingChainMock.issue.issuer.address,
                    issuingDoorAddress,
                );

                expect(res).toEqual(true);
            });

            test("Token bridge does not exist", async () => {
                ethersXChainProvider.getXChainBridges = jest.fn().mockResolvedValueOnce([]);

                const res = await ethersXChainProvider.tokenBridgeExists("0xD00R4DDR355", "not_erc20_address", "issuingDoorAddress");

                expect(res).toEqual(false);
            });
        });

        describe("findTokenBridge", () => {
            test("Finds token bridge when there's a matching xChainBridge", async () => {
                const xChainBridge = new XChainBridgeMock({
                    lockingChain: new XChainBridgeChainMock({
                        type: ChainType.EVM,
                        issue: new XChainBridgeIssue("PER", new XChainAddress("perAddress", ChainType.EVM)),
                    }),
                    issuingChain: new XChainBridgeChainMock({
                        type: ChainType.XRP,
                        issue: new XChainBridgeIssue("PER", new XChainAddress("doorAddress", ChainType.XRP)),
                    }),
                });
                ethersXChainProvider.getXChainBridges = jest.fn().mockResolvedValueOnce([xChainBridge]);

                const res = await ethersXChainProvider.findTokenBridge(
                    "doorAddress",
                    xChainBridge.lockingChain.issue.issuer.address,
                    xChainBridge.issuingChain.doorAddress.address,
                );

                expect(res).toEqual(xChainBridge);
            });

            test("Do not find a token bridge when there's not a matching xChainBridge", async () => {
                const xChainBridge = new XChainBridgeMock({ lockingChain: new XChainBridgeChainMock({ type: ChainType.EVM }) });
                ethersXChainProvider.getXChainBridges = jest.fn().mockResolvedValueOnce([xChainBridge]);

                const res = await ethersXChainProvider.findTokenBridge("doorAddress", "not_maching_issuer", "0xD00R4DDR355");

                expect(res).toBeUndefined();
            });

            test("Token bridge does not exist", async () => {
                ethersXChainProvider.getXChainBridges = jest.fn().mockResolvedValueOnce([]);

                const res = await ethersXChainProvider.findTokenBridge("doorAddress", "not_erc20_address", "0xD00R4DDR355");

                expect(res).toBeUndefined();
            });
        });
    });
});
