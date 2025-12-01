import { ethers } from "ethers";
import { BridgeDoorMultiToken, BridgeDoorMultiToken__factory, BridgeToken, BridgeToken__factory } from "@peersyst/xrp-evm-contracts";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import BigNumber from "bignumber.js";
import { EvmXChainWalletProvider } from "../../../../wallet/wallets/evm";
import { EthersXChainSignerProvider } from "../../../../signer/signers/evm";
import { FormattedBridge } from "../../../../bridge/Bridge";
import { ChainType } from "../../../../common/types";
import { ClaimId } from "../../../../bridge/utils";
import { BridgeDoorProvider } from "../../../../bridge/BridgeDoor/interfaces";
import { PartialXChainBridge } from "../../../../xchain";

export class EthersXChainProvider implements EvmXChainWalletProvider, EthersXChainSignerProvider, BridgeDoorProvider {
    constructor(readonly ethersProvider: ethers.providers.Provider) {}

    /**
     * Gets the token contract.
     * @param tokenAddress The token address.
     */
    protected getTokenContract(tokenAddress: string): BridgeToken {
        return BridgeToken__factory.connect(tokenAddress, this.ethersProvider);
    }

    /**
     * Gets the events of a contract.
     * @param contract The contract to get the events from.
     * @param filter The filter to apply to the events.
     */
    protected async getEvents(contract: ethers.Contract, filter: ethers.EventFilter): Promise<ethers.Event[]> {
        const chunkSize = 10_000;
        const currentBlock = await this.ethersProvider.getBlockNumber();
        let lastBlockFetched = currentBlock - 100_000;
        const events: ethers.Event[] = [];
        while (lastBlockFetched < currentBlock) {
            events.push(
                ...(await contract.queryFilter(
                    filter,
                    lastBlockFetched,
                    lastBlockFetched + chunkSize < currentBlock ? lastBlockFetched + chunkSize : currentBlock,
                )),
            );
            lastBlockFetched += chunkSize;
        }
        return events;
    }

    /**
     * Gets the native balance.
     * @param address The address of the account.
     */
    async getNativeBalance(address: string): Promise<string> {
        const balance = await this.ethersProvider.getBalance(address);
        return balance.toString();
    }

    /**
     * Gets the nonce.
     * @param address The address of the account.
     */
    async getNonce(address: string): Promise<number> {
        return this.ethersProvider.getTransactionCount(address);
    }

    async isAccountActive(address: string): Promise<boolean> {
        const [balance, nonce] = await Promise.all([this.getNativeBalance(address), this.getNonce(address)]);
        return !(BigNumber(balance).eq(0) && nonce === 0);
    }

    async getBridgeContract(
        doorAddress: string,
        signerOrProvider: ethers.Signer | ethers.providers.Provider = this.ethersProvider,
    ): Promise<BridgeDoorMultiToken> {
        const safeContract = new ethers.Contract(
            doorAddress,
            ["function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory array, address next)"],
            this.ethersProvider,
        );
        const modules = await safeContract.getModulesPaginated("0x0000000000000000000000000000000000000001", 2);
        if (modules.array.length !== 1) throw Error("Safe should only have one module");
        return BridgeDoorMultiToken__factory.connect(modules.array[0], signerOrProvider);
    }

    async getBridgeTokenAddress(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
    ): Promise<string> {
        const bridgeContract =
            typeof doorAddressOrBridgeContract === "string"
                ? await this.getBridgeContract(doorAddressOrBridgeContract)
                : doorAddressOrBridgeContract;
        return bridgeContract.getBridgeToken(xChainBridge);
    }

    async getBridgeTokenContract(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
        signerOrProvider: ethers.Signer | ethers.providers.Provider = this.ethersProvider,
    ): Promise<BridgeToken> {
        const tokenAddress = await this.getBridgeTokenAddress(doorAddressOrBridgeContract, xChainBridge);
        return BridgeToken__factory.connect(tokenAddress, signerOrProvider);
    }

    async getBridgeTokenDecimals(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
    ): Promise<number> {
        const tokenContract = await this.getBridgeTokenContract(doorAddressOrBridgeContract, xChainBridge);

        return tokenContract.decimals();
    }

    async isBridgeTokenContractApproved(address: string, bridge: FormattedBridge<ChainType.EVM>): Promise<boolean> {
        const bridgeContract = await this.getBridgeContract(bridge.originXChainBridgeChain.doorAddress);
        const tokenContract = await this.getBridgeTokenContract(bridgeContract, bridge.xChainBridge);

        const allowedAmount = await tokenContract.allowance(address, bridgeContract.address);

        return allowedAmount.gt(0);
    }

    async isClaimAttested(address: string, claimId: ClaimId, bridge: FormattedBridge<ChainType.EVM>): Promise<boolean> {
        const bridgeContract = await this.getBridgeContract(bridge.destinationXChainBridgeChain.doorAddress);
        const bridgeKey = await bridgeContract.getBridgeKey(bridge.xChainBridge);

        const creditEvents = await this.getEvents(bridgeContract, bridgeContract.filters.Credit(bridgeKey, claimId.int, address));

        return creditEvents.some((credit) => {
            const creditClaimId = ClaimId.fromHex((credit.args![1] as ethers.BigNumber).toHexString());
            return creditClaimId.hex === claimId.hex;
        });
    }

    isCreateAccountCommitAttested(address: string): Promise<boolean> {
        return this.isAccountActive(address);
    }

    async getXChainBridges(doorAddress: string, id?: string): Promise<PartialXChainBridge[]> {
        const bridgeContract = await this.getBridgeContract(doorAddress);
        const xChainBridges: PartialXChainBridge[] = [];
        let end = false,
            page = 0;

        while (!end) {
            const pageItems = await bridgeContract.getBridgesPaginated(page);
            for (let i = 0; i < pageItems.configs.length; i++) {
                if (pageItems.configs[i].issuingChainDoor === ethers.constants.AddressZero) {
                    end = true;
                    break;
                }
                const signatureReward = pageItems.params[i].signatureReward.toString();
                const minCreateAmount = pageItems.params[i].minCreateAmount.toString();

                xChainBridges.push(PartialXChainBridge.fromEvm(doorAddress, pageItems.configs[i], signatureReward, minCreateAmount, id));
            }
            page++;
        }

        return xChainBridges;
    }

    async isErc20Address(tokenAddress: string): Promise<boolean> {
        try {
            const tokenContract = this.getTokenContract(tokenAddress);

            await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol(),
                tokenContract.balanceOf(tokenAddress),
                tokenContract.totalSupply(),
            ]);
            return true;
        } catch (error) {
            return false;
        }
    }

    async tokenBridgeExists(doorAddress: string, token: string, issuingDoorAddress: string): Promise<boolean> {
        const xChainBridges = await this.getXChainBridges(doorAddress);
        for (const xChainBridge of xChainBridges) {
            if (
                xChainBridge.issuingChain.doorAddress.address.toLowerCase() === issuingDoorAddress.toLowerCase() &&
                token.toLowerCase() === xChainBridge.lockingChain.issue?.issuer.address.toLowerCase()
            )
                return true;
        }
        return false;
    }

    async getMinCreateBridgeReward(doorAddress: string): Promise<string> {
        const bridgeContract = await this.getBridgeContract(doorAddress);
        const minCreateBridgeReward = await bridgeContract.MIN_CREATE_BRIDGE_REWARD();
        return minCreateBridgeReward.toString();
    }

    async findTokenBridge(doorAddress: string, token: string, issuingDoorAddress: string): Promise<PartialXChainBridge | undefined> {
        const xChainBridges = await this.getXChainBridges(doorAddress);
        for (const xChainBridge of xChainBridges) {
            if (
                xChainBridge.issuingChain.doorAddress.address.toLowerCase() === issuingDoorAddress.toLowerCase() &&
                token.toLowerCase() === xChainBridge.lockingChain.issue?.issuer.address.toLowerCase()
            )
                return xChainBridge;
        }
        return undefined;
    }
}
