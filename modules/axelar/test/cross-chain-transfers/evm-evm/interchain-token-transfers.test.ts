import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import config from "../../../module.config.example.json";
import { PollingOptions, polling } from "@shared/utils";
import { assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken } from "@shared/evm/contracts";

describe("Interchain Token Transfers", () => {
    // Extract relevant configuration
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;
    const pollingOpts = interchainTransferOptions as PollingOptions;

    let sourceJsonProvider: ethers.JsonRpcProvider;
    let destinationJsonProvider: ethers.JsonRpcProvider;
    let sourceEvmProvider: EthersProvider;
    let destinationEvmProvider: EthersProvider;
    let sourceWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    let sourceEvmSigner: EthersSigner;
    let destinationEvmSigner: EthersSigner;

    // Interchain Token Instances (deployed addresses come from your config)
    let sourceInterchainToken: InterchainToken;
    let destinationInterchainToken: InterchainToken;

    // Deployed token addresses from config
    let sourceInterchainTokenDeployedAddress: string;
    let destinationInterchainTokenDeployedAddress: string;

    before(async () => {
        // Validate that both chains are EVM-based
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        // Extract chain properties
        const { urls: sourceUrls, account: sourceAccount, interchainTokenDeployedAddress: sourceTokenAddress } = sourceChain;
        const { urls: destUrls, account: destAccount, interchainTokenDeployedAddress: destinationTokenAddress } = destinationChain;

        // Store the deployed token addresses from config
        sourceInterchainTokenDeployedAddress = sourceTokenAddress;
        destinationInterchainTokenDeployedAddress = destinationTokenAddress;

        // Initialize providers
        sourceJsonProvider = new ethers.JsonRpcProvider(sourceUrls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        // Wrap providers
        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        // Initialize wallets
        sourceWallet = new ethers.Wallet(sourceAccount.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(destAccount.privateKey, destinationJsonProvider);

        // Initialize signers
        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        // Instantiate the Interchain Token contracts
        sourceInterchainToken = new InterchainToken(sourceInterchainTokenDeployedAddress, sourceWallet);
        destinationInterchainToken = new InterchainToken(destinationInterchainTokenDeployedAddress, destinationWallet);
    });

    describe("from evm Source chain to evm Destination chain", () => {
        it("should transfer tokens via interchainTransfer with empty metadata", async () => {
            const transferAmountStr = "0.2";
            const transferAmount = ethers.parseUnits(transferAmountStr, 18);

            const initialDestBalanceRaw = await destinationInterchainToken.balanceOf(destinationWallet.address);
            const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());
            console.log("Initial destination balance:", initialDestBalance.toString());

            const recipientBytes = ethers.zeroPadBytes(destinationWallet.address, 20);

            console.log("Tx prameters : ", destinationChain.name, recipientBytes, transferAmount, "0x");
            const tx = await sourceInterchainToken.interchainTransfer(destinationChain.name, recipientBytes, transferAmount, "0x", {
                value: ethers.parseUnits("1", "ether"),
            });
            console.log("Transfer tx hash (source -> destination):", tx.hash);
            await tx.wait();

            await polling(
                async () => {
                    const currentBalanceRaw = await destinationInterchainToken.balanceOf(destinationWallet.address);
                    const currentBalance = new BigNumber(currentBalanceRaw.toString());
                    return currentBalance.eq(initialDestBalance.plus(new BigNumber(transferAmount.toString())));
                },
                (result) => !result,
                pollingOpts,
            );

            const finalDestBalanceRaw = await destinationInterchainToken.balanceOf(destinationWallet.address);
            const finalDestBalance = new BigNumber(finalDestBalanceRaw.toString());
            console.log("Final destination balance:", finalDestBalance.toString());
            const expectedDestBalance = initialDestBalance.plus(new BigNumber(transferAmount.toString()));
            if (!finalDestBalance.eq(expectedDestBalance)) {
                throw new Error(
                    `Destination balance mismatch! Expected: ${expectedDestBalance.toString()}, Actual: ${finalDestBalance.toString()}`,
                );
            }
        });
    });

    describe("from evm Destination chain to evm Source chain", () => {
        it("should transfer tokens via interchainTransfer with empty metadata", async () => {
            const transferAmountStr = "0.221";
            const transferAmount = ethers.parseUnits(transferAmountStr, 18);

            const initialSourceBalanceRaw = await sourceInterchainToken.balanceOf(sourceWallet.address);
            const initialSourceBalance = new BigNumber(initialSourceBalanceRaw.toString());
            console.log("Initial source balance:", initialSourceBalance.toString());

            const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

            const tx = await destinationInterchainToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x");
            console.log("Transfer tx hash (destination -> source):", tx.hash);
            await tx.wait();

            await polling(
                async () => {
                    const currentBalanceRaw = await sourceInterchainToken.balanceOf(sourceWallet.address);
                    const currentBalance = new BigNumber(currentBalanceRaw.toString());
                    return currentBalance.eq(initialSourceBalance.plus(new BigNumber(transferAmount.toString())));
                },
                (result) => !result,
                pollingOpts,
            );

            const finalSourceBalanceRaw = await sourceInterchainToken.balanceOf(sourceWallet.address);
            const finalSourceBalance = new BigNumber(finalSourceBalanceRaw.toString());
            console.log("Final source balance:", finalSourceBalance.toString());
            const expectedSourceBalance = initialSourceBalance.plus(new BigNumber(transferAmount.toString()));
            if (!finalSourceBalance.eq(expectedSourceBalance)) {
                throw new Error(
                    `Source balance mismatch! Expected: ${expectedSourceBalance.toString()}, Actual: ${finalSourceBalance.toString()}`,
                );
            }
        });
    });
});
