import { ERC20, InterchainTokenService, AxelarAmplifierGateway, AxelarGasService } from "@shared/evm/contracts";
import { ethers } from "ethers";

export interface IEthersSignerProvider {
    /**
     * Gets the ERC20 contract.
     * @param address The address of the ERC20 contract.
     * @param signerOrProvider The signer or provider.
     * @returns The ERC20 contract.
     */
    getERC20Contract(address: string, signerOrProvider: ethers.Signer | ethers.Provider): ERC20;

    /**
     * Gets the Interchain Token Service contract.
     * @param address The address of the Interchain Token Service contract.
     * @param signerOrProvider The signer or provider.
     * @returns The Interchain Token Service contract.
     */
    getInterchainTokenServiceContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider): InterchainTokenService;

    /**
     * Gets the Axelar Gateway contract.
     * @param address The address of the Axelar Gateway contract.
     * @param signerOrProvider The signer or provider.
     * @returns The Axelar Gateway contract.
     */
    getAxelarAmplifierGatewayContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider): AxelarAmplifierGateway;

    /**
     * Gets the Axelar Gas Service contract.
     * @param address The address of the Axelar Gas Service contract.
     * @param signerOrProvider The signer or provider.
     * @returns The Axelar Gas Service contract.
     */
    getAxelarGasServiceContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider): AxelarGasService;
}
