## 1. Native EVM → XRPL

- Transfer to a non‐existent XRPL account without attaching the 10 XRP reserve → expect failure
    - [x] Code
    - [ ] Test
- Transfer to a non‐existent XRPL account with ≥ 10 XRP reserve → expect success (account auto‐created)
    - [x] Code
    - [ ] Test
- Transfer to a non-existing XRPL account without attached reserve but with reserve added after → expect success
    - [x] Code
    - [ ] Test
- Transfer dust (e.g. < 0.00000000001 XRP) → expect failure
    - [x] Code
    - [ ] Test
- Transfer 0 XRP → expect failure
    - [x] Code
    - [ ] Test
- Transfer to an invalid destination (malformed address) → expect error
    - [x] Code
    - [ ] Test
- Transfer with decimal precision handling
    - Transfer amount with more decimals than supported (>6) → should truncate to 6 decimals
        - [x] Code
        - [ ] Test
    - Transfer amount with exactly 6 decimals → should process exact amount
        - [x] Code
        - [ ] Test

## 2. Native XRPL → EVM

- Transfer dust (e.g. < 0.000001 XRP) → expect failure
    - [ ] Code
    - [ ] Test
- Transfer exactly (balance – reserve) → expect success
    - [x] Code //TODO Calculate precise balance (fees)
    - [ ] Test
- Transfer less than reserve → expect failure
    - [x] Code
    - [ ] Test
- Transfer with decimal precision handling
    - Transfer amount with 6 decimals → should extend to 18 decimals on EVM chain properly
        - [x] Code
        - [ ] Test
    - Transfer amount with fewer than 6 decimals → should extend to 18 decimals on EVM chain properly
        - [ ] Code
        - [ ] Test
- Payment without a valid `gas_fee_amount` memo → stuck at “Pay Gas” → never Confirm
    - [x] Code
    - [ ] Test
- Payment with `gas_fee_amount` too low → stays stuck → no Confirm
    - [x] Code
    - [ ] Test
- After under-funding, add a small “add_gas” top-up (still too little) → still fails
    - [x] Code
    - [ ] Test
- After under-funding, top-up with the exact required amount → succeeds (Confirm → Execute)
    - [x] Code
    - [ ] Test

<!-- - Omit the `type = interchain_transfer` memo → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Invalid/mismatched `destination_chain` string → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Invalid/mismatched `destination_address` string → ignored → no Confirm
    - [ ] Code
    - [ ] Test -->

## 3. ERC-20 EVM → XRPL

- ERC-20 transfer to non-existent XRPL account without reserve → failure
    - [x] Code
    - [ ] Test
- ERC-20 transfer dust (below token’s minimum unit) → failure
    - [x] Code
    - [ ] Test
- ERC-20 transfer to invalid XRPL address → failure
    - [x] Code
    - [ ] Test
- Transfer amount greater than available balance → expect failure
    - [x] Code
    - [ ] Test

## 4. IOU XRPL → EVM

<!-- - IOU Payment without `gas_fee_amount` memo → stuck → no Confirm
    - [ ] Code
    - [ ] Test -->

<!-- - IOU Payment with `gas_fee_amount` too low → stuck → no Confirm
    - [ ] Code
    - [ ] Test -->

<!-- - Re-adding insufficient gas via `add_gas` → still stuck
        - [ ] Code
        - [ ] Test
- Proper top-up via `add_gas` → Confirm → Execute
    - [ ] Code
    - [ ] Test -->

<!-- - After under-funding, top-up with the exact required amount → succeeds (Confirm → Execute)
    - [ ] Code
    - [ ] Test -->

<!-- - Missing `token_address` or `token_chain` memos → ignored → no Confirm
    - [ ] Code
    - [ ] Test -->

<!-- - Payment to non-existent EVM address → contract-call revert / error
    - [ ] Code
    - [ ] Test -->

- IOU dust amount (< smallest token unit) → failure on XRPL submit
    - [x] Code
    - [ ] Test

## 5. GMP XRPL → EVM via `contract_call`

- Memo `type=contract_call` missing or wrong → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Memo `payload` missing → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Memo `destination_chain` or `destination_address` invalid/mismatched → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Memo `gas_fee_amount` missing → stuck at Pay Gas → no Confirm
    - [ ] Code
    - [ ] Test
- Memo `gas_fee_amount` too low → stuck → no Confirm
    - [ ] Code
    - [ ] Test
- Incorrect hex-encoding of memos → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- After under-funding, send `add_gas` with insufficient amount → still stuck
    - [ ] Code
    - [ ] Test
- After under-funding, send `add_gas` with exact/EVM-estimate amount → Confirm → Approve → Execute
    - [ ] Code
    - [ ] Test

## 6. GMP XRPL → EVM via `interchain_transfer`

- Memo `type=interchain_transfer` missing or wrong → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Missing `token_id` for interchain tokens → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Missing `destination_chain` or `destination_address` → ignored → no Confirm
    - [ ] Code
    - [ ] Test
- Missing or malformed `gas_fee_amount` → stuck at Pay Gas → no Confirm
    - [ ] Code
    - [ ] Test
- Under-funded `gas_fee_amount` → stuck → no Confirm
    - [ ] Code
    - [ ] Test
- Re-adding insufficient gas → still stuck
    - [ ] Code
    - [ ] Test
- Correct memos + exact top-up → Confirm → Approve → Execute
    - [ ] Code
    - [ ] Test
