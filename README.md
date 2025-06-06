# E2E test suite

This project aims to create an end-to-end (e2e) test suite for the XRPL EVM Sidechain across all its environments. It verifies not only the sidechain’s functionality but also its communication with other modules such as Axelar and Cosmos.

---

## Configuration Files and Environment Setup

Each module will have its own `.env` file and a configuration file following the `<chain-env>.config.json` naming convention (e.g., `testnet.config.example.json`, `mainnet.config.example.json`).

- **.env File:**  
  Stores environment variables such as API keys, secrets, and the current environment indicator (e.g., `NETWORK=devnet`).

- **Configuration Files:**  
  Contain chain-specific, static settings for tests and deployment. The application loads the appropriate config file based on the `ENV` value from the `.env` file (e.g., if `NETWORK=devnet`, it loads `devnet.config.json`).

---

## Devnet and Testnet Testsuite

The following checklist outlines the core tests that should be performed across both Devnet and Testnet environments. It covers Cosmos, Axelar, and EVM components to ensure interoperability, token behavior, and validator setup are consistent and reliable across deployments.

### Cosmos

- [x] Slashing params check
- [ ] ERC20
    - [ ] Mint
    - [x] Burn
    - [x] BurnFrom
    - [x] Approve
    - [x] Transfer
    - [x] TransferFrom
    - [x] Query (symbol, balanceOf, allowance, name…)
- [x] PoA
    - [x] All validators should have the same amount of staking bond denom (1)
    - [x] All validators should only have the self delegation share

### Axelar

- [x] Native transfers XRPL <> EVM
- [x] Token transfers EVM <> EVM
- [x] GMP XRPL → EVM
- [x] GMP EVM <> EVM
- [x] Total supply test

### EVM

- [ ] ERC20 precompiles
    - [ ] Mint
    - [ ] Burn0
    - [x] Burn
    - [x] BurnFrom
    - [ ] TransferOwnership
    - [x] Approve
    - [x] Transfer
    - [x] TransferFrom
    - [x] Query (symbol, balanceOf, allowance, name…)

---

## Mainnet

### Cosmos

- [x] Slashing params check
- [ ] ERC20
    - [ ] Mint
    - [ ] Burn
    - [ ] BurnFrom
    - [ ] Approve
    - [ ] Transfer
    - [ ] TransferFrom
    - [x] Query (symbol, balanceOf, allowance, name…)
- [x] PoA
    - [x] All validators should have the same amount of staking bond denom (1)
    - [x] All validators should only have the self delegation share

### Axelar

- [ ] Native transfers XRPL <> EVM
- [ ] Token transfers EVM <> EVM
- [ ] GMP XRPL → EVM
- [ ] GMP EVM <> EVM
- [x] Total supply test

### EVM

- [ ] ERC20 precompiles
    - [ ] Mint
    - [ ] Burn0
    - [ ] Burn
    - [ ] BurnFrom
    - [ ] TransferOwnership
    - [ ] Approve
    - [ ] Transfer
    - [ ] TransferFrom
    - [x] Query (symbol, balanceOf, allowance, name…)
