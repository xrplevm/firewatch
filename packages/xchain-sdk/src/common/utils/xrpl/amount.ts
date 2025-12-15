import { Amount, Currency, IssuedCurrency, xrpToDrops } from "xrpl";

/**
 * Checks if currency is IssuedCurrency
 * @param currency The currency to check.
 * @returns Whether the currency is IssuedCurrency.
 */
export function isIssuedCurrency(currency: Currency): currency is IssuedCurrency {
    return "currency" in currency && "issuer" in currency;
}

/**
 * Builds an XRPL amount from an amount and currency.
 * @param amount The amount.
 * @param currency The currency.
 * @returns The XRPL amount.
 */
export function buildAmount(amount: string, currency: Currency): Amount {
    // If currency is IssuedCurrency build IssuedCurrencyAmount. Otherwise, return amount as string
    if (isIssuedCurrency(currency)) {
        return {
            ...currency,
            value: amount,
        };
    } else {
        return xrpToDrops(amount);
    }
}
