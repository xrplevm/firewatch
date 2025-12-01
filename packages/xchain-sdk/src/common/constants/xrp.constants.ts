import BigNumber from "bignumber.js";

export const XRP = "XRP";
export const XRP_DECIMALS = 6;

export const IOU_DECIMALS = 15;
export const MAX_SAFE_IOU_AMOUNT = BigNumber(10)
    .pow(IOU_DECIMALS + 1)
    .minus(1)
    .toString();
