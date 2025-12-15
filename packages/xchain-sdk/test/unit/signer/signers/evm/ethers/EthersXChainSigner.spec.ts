import { ethers } from "ethers";
import { Bridge } from "../../../../../../src/bridge/Bridge";
import { BridgeDirection, ChainType } from "../../../../../../src/common/types";
import { EthersXChainSigner, EthersXChainSignerProvider } from "../../../../../../src/signer/signers/evm";
import {
    EthersXChainSignerError,
    EthersXChainSignerErrors,
} from "../../../../../../src/signer/signers/evm/ethers/EthersXChainSigner.errors";
import { XChainAddress, XChainBridgeIssue } from "../../../../../../src/xchain";
import { ContractReceiptMock } from "../../../../../mocks/ethers/ContractReceipt.mock";
import { ContractTransactionMock } from "../../../../../mocks/ethers/ContractTransaction.mock";
import { EventMock } from "../../../../../mocks/ethers/Event.mock";
import { ProviderMock as EthersProviderMock } from "../../../../../mocks/ethers/Provider.mock";
import { SignerMock as EthersSignerMock } from "../../../../../mocks/ethers/Signer.mock";
import { EthersXChainSignerProviderMock } from "../../../../../mocks/signer/signers/evm/ethers/EthersXChainSignerProvider.mock";
import { XChainBridgeMock } from "../../../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../../../mocks/xchain/XChainBridgeChain.mock";
import { BridgeDoorMultiTokenMock } from "../../../../../mocks/xrp-evm-contracts/BridgeDoorMultiToken.mock";
import { BridgeTokenMock } from "../../../../../mocks/xrp-evm-contracts/BridgeToken.mock";
import MethodMock from "../../../../../utils/MethodMock";
import { ClaimId } from "../../../../../../src/bridge/utils";
import { decimalToInt } from "../../../../../../src/common/utils/number";
import { EVM_DECIMALS } from "../../../../../../src/common/constants/evm.constants";

describe("EthersXChainSigner", () => {
    describe("constructor", () => {
        test("Creates an EthersXChainSigner instance with an ethers signer attached to an ethers provider", () => {
            const ethersProviderMock = new EthersProviderMock();
            const ethersSignerMock = new EthersSignerMock({ provider: ethersProviderMock });

            const ethersXChainSigner = new EthersXChainSigner(
                ethersSignerMock,
                ethersProviderMock as unknown as EthersXChainSignerProvider,
            );

            expect(ethersXChainSigner).toBeDefined();
        });

        test("Creates an EthersXChainSigner instance with a simple signer and a custom provider", () => {
            const ethersSignerMock = new EthersSignerMock();
            const provider = new EthersXChainSignerProviderMock();

            const ethersXChainSigner = new EthersXChainSigner(ethersSignerMock, provider);

            expect(ethersXChainSigner).toBeDefined();
        });

        test("Throws PROVIDER_NOT_PROVIDED error", async () => {
            const ethersSignerMock = new EthersSignerMock();

            expect(() => new EthersXChainSigner(ethersSignerMock)).toThrow(
                new EthersXChainSignerError(EthersXChainSignerErrors.PROVIDER_NOT_PROVIDED),
            );
        });
    });

    describe("instance", () => {
        let ethersXChainSigner: EthersXChainSigner;

        const address = "0x123";
        const nativeXChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({ type: ChainType.EVM, issue: new XChainBridgeIssue<ChainType.EVM>("XRP") }),
            issuingChain: new XChainBridgeChainMock({ type: ChainType.EVM, issue: new XChainBridgeIssue<ChainType.EVM>("XRP") }),
        });
        const nativeBridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, nativeXChainBridge);
        const nativeBridgeForOrigin = nativeBridge.forOrigin();
        const nativeBridgeForDestination = nativeBridge.forDestination();
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

        const signerMock = new EthersSignerMock({ getAddress: new MethodMock("mockResolvedValue", address) });
        const providerMock = new EthersXChainSignerProviderMock();

        const bridgeContractMock = new BridgeDoorMultiTokenMock();
        const bridgeTokenContractMock = new BridgeTokenMock();

        let getBridgeContractMock: jest.SpyInstance;
        let getBridgeTokenContractMock: jest.SpyInstance;

        beforeEach(() => {
            signerMock.clearMocks();
            providerMock.clearMocks();

            ethersXChainSigner = new EthersXChainSigner(signerMock, providerMock);

            // Mock methods that get contract instances
            getBridgeContractMock = jest.spyOn(ethersXChainSigner as any, "getBridgeContract").mockResolvedValue(bridgeContractMock);
            getBridgeTokenContractMock = jest
                .spyOn(ethersXChainSigner as any, "getBridgeTokenContract")
                .mockReturnValue(bridgeTokenContractMock);
        });

        afterEach(() => {
            getBridgeContractMock.mockClear();
            getBridgeTokenContractMock.mockClear();
        });

        describe("getAddress", () => {
            test("Gets address", async () => {
                const res = await ethersXChainSigner.getAddress();

                expect(res).toEqual(address);
            });
        });

        describe("approveBridgeTokenContract", () => {
            test("Approves bridge token contract", async () => {
                const approveTxHash = "0x123";
                const contractTransactionMock = new ContractTransactionMock({ hash: approveTxHash });

                bridgeTokenContractMock.approve.mockResolvedValueOnce(contractTransactionMock);

                const res = await ethersXChainSigner.approveBridgeTokenContract(nativeBridge);

                expect(bridgeTokenContractMock.approve).toHaveBeenCalledWith(bridgeContractMock.address, ethers.constants.MaxUint256);
                expect(res.hash).toEqual(approveTxHash);
            });
        });

        describe("createClaim", () => {
            const claimId = ethers.BigNumber.from("1");
            const createClaimTxHash = "0x123";
            const originAddress = "0x456";

            const createClaimTransactionMock = new ContractTransactionMock({
                hash: createClaimTxHash,
                receipt: new ContractReceiptMock({ events: [new EventMock({ event: "CreateClaim", args: [undefined, claimId] })] }),
            });

            beforeEach(() => {
                bridgeContractMock.createClaimId.mockResolvedValueOnce(createClaimTransactionMock);
            });

            test("Creates a claim", async () => {
                const res = await ethersXChainSigner.createClaim(originAddress, nativeBridgeForDestination);
                const confirmedTx = await res.wait();

                expect(bridgeContractMock.createClaimId).toHaveBeenCalledWith(nativeBridgeForDestination.xChainBridge, originAddress, {
                    value: nativeBridge.destinationXChainBridgeChain.signatureReward,
                });
                expect(res.hash).toEqual(createClaimTxHash);
                expect(confirmedTx.claimId.hex).toEqual(ClaimId.fromHex(claimId.toHexString()).hex);
            });
        });

        describe("commit", () => {
            const claimId = new ClaimId("1");
            const commitTxHash = "0x123";
            const destinationAddress = "0x789";
            const amount = "100";

            const commitTransactionMock = new ContractTransactionMock({
                hash: commitTxHash,
            });

            beforeEach(() => {
                bridgeContractMock.commit.mockResolvedValueOnce(commitTransactionMock);
            });

            test("Creates a native commit", async () => {
                const sendingAmount = ethers.BigNumber.from(decimalToInt(amount, EVM_DECIMALS));

                const res = await ethersXChainSigner.commit(claimId, destinationAddress, nativeBridgeForOrigin, amount);

                expect(bridgeContractMock.commit).toHaveBeenCalledWith(
                    nativeBridgeForOrigin.xChainBridge,
                    destinationAddress,
                    claimId.int,
                    sendingAmount,
                    {
                        value: sendingAmount.toString(),
                    },
                );
                expect(res.hash).toEqual(commitTxHash);
            });

            test("Creates a token commit", async () => {
                const decimals = 15;
                const sendingAmount = ethers.BigNumber.from(decimalToInt(amount, decimals));

                providerMock.getBridgeTokenDecimals.mockResolvedValueOnce(decimals);

                const res = await ethersXChainSigner.commit(claimId, destinationAddress, tokenBridgeForOrigin, amount);

                expect(bridgeContractMock.commit).toHaveBeenCalledWith(
                    tokenBridgeForOrigin.xChainBridge,
                    destinationAddress,
                    claimId.int,
                    sendingAmount,
                    {
                        value: 0,
                    },
                );
                expect(res.hash).toEqual(commitTxHash);
            });
        });

        describe("createAccountCommit", () => {
            const createAccountCommitTxHash = "0x123";
            const destinationAddress = "0x456";
            const amount = "100";

            const createAccountCommitTransactionMock = new ContractTransactionMock({
                hash: createAccountCommitTxHash,
            });

            beforeEach(() => {
                bridgeContractMock.createAccountCommit.mockResolvedValueOnce(createAccountCommitTransactionMock);
            });

            test("Creates a create account commit", async () => {
                const sendingAmount = ethers.BigNumber.from(decimalToInt(amount, EVM_DECIMALS));

                const res = await ethersXChainSigner.createAccountCommit(destinationAddress, nativeBridgeForOrigin, amount);

                expect(bridgeContractMock.createAccountCommit).toHaveBeenCalledWith(
                    nativeBridgeForOrigin.xChainBridge,
                    destinationAddress,
                    sendingAmount,
                    nativeBridge.destinationXChainBridgeChain.signatureReward,
                    {
                        value: sendingAmount.add(nativeBridge.destinationXChainBridgeChain.signatureReward).toString(),
                    },
                );
                expect(res.hash).toEqual(createAccountCommitTxHash);
            });
        });

        describe("createBridgeRequest", () => {
            const createBridgeRequestTxHash = "0x123";
            const doorAddress = "0x456";
            const issuingDoorAddress = "issuingDoorAddress";
            const tokenAddress = "0x789";
            const value = "100";

            const createBridgeRequestTransactionMock = new ContractTransactionMock({
                hash: createBridgeRequestTxHash,
            });

            beforeEach(() => {
                bridgeContractMock.createBridgeRequest.mockResolvedValueOnce(createBridgeRequestTransactionMock);
            });

            test("Creates a bridge request", async () => {
                providerMock.getMinCreateBridgeReward.mockResolvedValueOnce(value);

                const res = await ethersXChainSigner.createBridgeRequest(doorAddress, tokenAddress, issuingDoorAddress);

                expect(bridgeContractMock.createBridgeRequest).toHaveBeenCalledWith(tokenAddress, {
                    value,
                });
                expect(res.hash).toEqual(createBridgeRequestTxHash);
            });
        });
    });
});
