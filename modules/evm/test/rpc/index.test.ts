import { expect } from "chai";
import moduleConfig from "../../module.config.json";
import { ethers } from "hardhat";
import { JsonRpcProvider } from "ethers";
import { RPCFixtureConfig } from "../../src/rpc/config/config";
import { isDisabledCall } from "../../src/rpc/utils/disabled-calls";
import { describeOrSkip } from "@testing/mocha/utils";

describe("Ethereum RPC", () => {
    let rpcProvider: JsonRpcProvider;

    before(async () => {
        // Get the RPC URL from hardhat network configuration
        const defaultNetwork = moduleConfig.hardhat.defaultNetwork;
        const networkConfig = moduleConfig.hardhat.networks[defaultNetwork as keyof typeof moduleConfig.hardhat.networks];
        const rpcUrl = networkConfig.url;

        // Create a JsonRpcProvider for direct RPC calls
        rpcProvider = new JsonRpcProvider(rpcUrl);
    });

    // Get fixtures from config - handle both old structure (rpc.block/transaction) and new structure (fixtures array)
    const fixtures: RPCFixtureConfig[] = moduleConfig.contracts.rpc as RPCFixtureConfig[];

    fixtures.forEach((fixture: RPCFixtureConfig) => {
        describe(`Fixture: ${fixture.label}`, () => {
            const blockHash = fixture.block.hash;
            const blockNumber = fixture.block.number;
            const txHash = fixture.transaction.hash;
            const txIndex = fixture.transaction.index;

            describeOrSkip("eth_getBlockByNumber", !isDisabledCall("eth_getBlockByNumber", fixture.disabledCalls), () => {
                it("should return the block by number", async () => {
                    const blockHex = `0x${blockNumber.toString(16)}`;
                    const block = await rpcProvider.send("eth_getBlockByNumber", [blockHex, false]);
                    expect(block?.hash).to.equal(blockHash);
                    expect(parseInt(block?.number, 16)).to.equal(blockNumber);
                });
            });

            describeOrSkip("eth_getBlockByHash", !isDisabledCall("eth_getBlockByHash", fixture.disabledCalls), () => {
                it("should return the block by hash", async () => {
                    const block = await ethers.provider.getBlock(blockHash);
                    expect(block?.hash).to.equal(blockHash);
                    expect(block?.number).to.equal(blockNumber);
                });
            });

            describeOrSkip("eth_getBlockReceipts", !isDisabledCall("eth_getBlockReceipts", fixture.disabledCalls), () => {
                it("should return the block receipts", async () => {
                    const blockHex = `0x${blockNumber.toString(16)}`;
                    const receipts = await rpcProvider.send("eth_getBlockReceipts", [blockHex]);
                    expect(receipts).to.be.an("array");
                    expect(receipts.length).to.be.greaterThan(0);
                    const receipt = receipts.find((r: any) => r.transactionHash === txHash);
                    expect(receipt?.transactionHash).to.equal(txHash);
                    expect(parseInt(receipt?.blockNumber, 16)).to.equal(blockNumber);
                });
            });

            describeOrSkip("eth_getTransactionByHash", !isDisabledCall("eth_getTransactionByHash", fixture.disabledCalls), () => {
                it("should return the transaction by hash", async () => {
                    const transaction = await ethers.provider.getTransaction(txHash);
                    expect(transaction?.hash).to.equal(txHash);
                    expect(transaction?.blockNumber).to.equal(blockNumber);
                    expect(transaction?.blockHash).to.equal(blockHash);
                });
            });

            describeOrSkip("eth_getTransactionReceipt", !isDisabledCall("eth_getTransactionReceipt", fixture.disabledCalls), () => {
                it("should return the transaction receipt by hash", async () => {
                    const receipt = await ethers.provider.getTransactionReceipt(txHash);
                    expect(receipt?.hash).to.equal(txHash);
                    expect(receipt?.blockNumber).to.equal(blockNumber);
                    expect(receipt?.blockHash).to.equal(blockHash);
                });
            });

            describeOrSkip(
                "eth_getTransactionByBlockHashAndIndex",
                !isDisabledCall("eth_getTransactionByBlockHashAndIndex", fixture.disabledCalls),
                () => {
                    it("should return the transaction by block hash and index", async () => {
                        const transaction = await rpcProvider.send("eth_getTransactionByBlockHashAndIndex", [
                            blockHash,
                            `0x${txIndex.toString(16)}`,
                        ]);
                        expect(transaction?.hash).to.equal(txHash);
                        expect(parseInt(transaction?.blockNumber, 16)).to.equal(blockNumber);
                        expect(transaction?.blockHash).to.equal(blockHash);
                    });
                },
            );

            describeOrSkip(
                "eth_getTransactionByBlockNumberAndIndex",
                !isDisabledCall("eth_getTransactionByBlockNumberAndIndex", fixture.disabledCalls),
                () => {
                    it("should return the transaction by block number and index", async () => {
                        const blockHex = `0x${blockNumber.toString(16)}`;
                        const transaction = await rpcProvider.send("eth_getTransactionByBlockNumberAndIndex", [
                            blockHex,
                            `0x${txIndex.toString(16)}`,
                        ]);
                        expect(transaction?.hash).to.equal(txHash);
                        expect(parseInt(transaction?.blockNumber, 16)).to.equal(blockNumber);
                        expect(transaction?.blockHash).to.equal(blockHash);
                    });
                },
            );

            describeOrSkip(
                "eth_getBlockTransactionCountByHash",
                !isDisabledCall("eth_getBlockTransactionCountByHash", fixture.disabledCalls),
                () => {
                    it("should return the transaction count by block hash", async () => {
                        const count = await rpcProvider.send("eth_getBlockTransactionCountByHash", [blockHash]);
                        expect(parseInt(count, 16)).to.be.greaterThan(0);
                    });
                },
            );

            describeOrSkip(
                "eth_getBlockTransactionCountByNumber",
                !isDisabledCall("eth_getBlockTransactionCountByNumber", fixture.disabledCalls),
                () => {
                    it("should return the transaction count by block number", async () => {
                        const blockHex = `0x${blockNumber.toString(16)}`;
                        const count = await rpcProvider.send("eth_getBlockTransactionCountByNumber", [blockHex]);
                        expect(parseInt(count, 16)).to.be.greaterThan(0);
                    });
                },
            );

            describeOrSkip("eth_getTransactionCount", !isDisabledCall("eth_getTransactionCount", fixture.disabledCalls), () => {
                it("should return the transaction count", async () => {
                    // Get an address from the transaction
                    const transaction = await rpcProvider.send("eth_getTransactionByHash", [txHash]);
                    const address = transaction.from;
                    const transactionCount = await rpcProvider.send("eth_getTransactionCount", [address, "latest"]);
                    expect(parseInt(transactionCount, 16)).to.be.a("number");
                });
            });

            describeOrSkip("eth_feeHistory", !isDisabledCall("eth_feeHistory", fixture.disabledCalls), () => {
                it("should return the fee history", async () => {
                    const feeHistory = await rpcProvider.send("eth_feeHistory", ["0x1", "latest", [25, 75]]);
                    expect(feeHistory).to.have.property("oldestBlock");
                    expect(feeHistory).to.have.property("baseFeePerGas");
                    expect(feeHistory).to.have.property("gasUsedRatio");
                });
            });

            describeOrSkip("eth_gasPrice", !isDisabledCall("eth_gasPrice", fixture.disabledCalls), () => {
                it("should return the gas price", async () => {
                    const gasPrice = await rpcProvider.send("eth_gasPrice", []);
                    expect(gasPrice).to.be.a("string");
                    expect(gasPrice).to.match(/^0x[0-9a-fA-F]+$/);
                    expect(parseInt(gasPrice, 16)).to.be.greaterThan(0);
                });
            });
        });
    });
});
