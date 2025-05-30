import { Token } from "@firewatch/core/token";
import { EthersSigner } from "../../../../bridge/src/signers/evm/ethers";
import { XrplSigner } from "../../../../bridge/src/signers/xrp/xrpl";
import { ERC20 } from "@shared/evm/contracts";
import BigNumber from "bignumber.js";
import { Chain } from "@firewatch/core/chain";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { polling, PollingOptions } from "@shared/utils";
import { ethers } from "ethers";

/**
 * Resets the total token supply on a blockchain by bridging in the missing tokens.
 * It calculates the missing amount by comparing the initial total supply with the current supply,
 * and then bridges in the missing tokens using the appropriate signer (EVM or XRPL).
 * @param token The token for which the total supply is being reset.
 * @param sourceDoorAddress The door address to use for the transfer.
 * @param xrplEvmChain The target chain details where tokens should be bridged in.
 * @param initialTotalSupply The initial total supply (in raw value matching the contract's units).
 * @param tokenContract The ERC20 token contract instance.
 * @param signer The signer instance (EthersSigner or XrplSigner) used for transferring tokens.
 * @param xrplEvmWalletAddress The wallet address on the EVM chain (used for translation in case of EVM signer).
 * @param interchainTransferOptions Polling options used to verify that the total supply has been updated.
 * @param gasValue The gas value to use for the transfer.
 * @returns A promise that resolves to an Unconfirmed transaction (EVM or XRPL) representing the bridging in transfer.
 */
export async function resetTotalSupply(
    token: Token,
    sourceDoorAddress: string,
    xrplEvmChain: Chain,
    initialTotalSupply: string,
    tokenContract: ERC20,
    signer: EthersSigner | XrplSigner,
    xrplEvmWalletAddress: string,
    interchainTransferOptions: PollingOptions,
    gasValue?: string,
) {
    const totalSupplyRaw = await tokenContract.totalSupply();

    const currentTotalSupply = new BigNumber(totalSupplyRaw.toString());
    const initSupply = new BigNumber(initialTotalSupply);
    const amountToBridgeInRaw = initSupply.minus(currentTotalSupply);

    if (amountToBridgeInRaw.lte(0)) {
        return;
    }

    let destinationAddress: string;
    const amountToBridgeIn = ethers.formatUnits(amountToBridgeInRaw.toString(), 18);

    if (signer instanceof EthersSigner) {
        destinationAddress = xrplEvmWalletAddress;
        await signer.transfer(amountToBridgeIn.toString(), token, sourceDoorAddress, xrplEvmChain.id, destinationAddress, { gasValue });
    } else if (signer instanceof XrplSigner) {
        const xrplChainTranslator = new XrpTranslator();
        destinationAddress = xrplChainTranslator.translate(xrplEvmChain.type, xrplEvmWalletAddress);
        await signer.transfer(amountToBridgeIn.toString(), token, sourceDoorAddress, xrplEvmChain.id, destinationAddress);
    }

    await polling(
        async () => {
            const totalSupply = await tokenContract.totalSupply();
            return new BigNumber(totalSupply.toString()).eq(initSupply);
        },
        (result) => !result,
        interchainTransferOptions,
    );
}
