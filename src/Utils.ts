export class Utils {
    static formatWithSignificantDigits(value: number, digits: number): string {
        const absValue = Math.abs(value);
        if (absValue === 0) return '0';

        const digitsPastDecimalPoint = digits - (Math.floor(Math.log10(absValue)) + 1);
        if (digitsPastDecimalPoint > 0) {
            // Format so that there are trailing zeros so that the number has exactly `digits` significant digits
            return value.toFixed(digitsPastDecimalPoint);
        }

        const factor = Math.pow(10, digitsPastDecimalPoint);
        return (Math.round(value * factor) / factor).toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    static readonly #BASE64_URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    static base64UrlPackIntegers(... values: RangedInt[]) {
        let base64Url = '';
        let currentValue = 0;

        for (const value of values) {
            currentValue *= value.range.inclusiveSize;
            currentValue += value.value - value.range.min;

            while (currentValue >= 63) {
                base64Url += Utils.#BASE64_URL_CHARS.charAt(currentValue & 63);
                currentValue >>= 6;
            }
        }

        if (currentValue !== 0)
            base64Url += Utils.#BASE64_URL_CHARS.charAt(currentValue);

        return base64Url;
    }
}
