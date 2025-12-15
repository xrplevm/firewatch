export class ClaimId {
    /**
     * Claim ID as hex string without 0x prefix
     */
    private value: string;

    /**
     * Claim ID as hex string without 0x prefix
     */
    get hex(): string {
        return this.value;
    }

    /**
     * Claim ID as integer
     */
    get int(): number {
        return parseInt(this.value, 16);
    }

    /**
     * Creates a new ClaimId instance
     * @param value Claim ID as hex string without 0x prefix
     */
    constructor(value: string) {
        this.value = value.padStart(16, "0").toUpperCase();
    }

    /**
     * Creates a new ClaimId instance from a number
     * @param value The claim ID as a number
     */
    static fromInt(value: number): ClaimId {
        return new ClaimId(value.toString(16));
    }

    /**
     * Creates a new ClaimId instance from a hex string
     * @param value The claim ID as a hex string
     */
    static fromHex(value: string): ClaimId {
        const hexValue = value.replace("0x", "");
        return new ClaimId(hexValue);
    }
}
