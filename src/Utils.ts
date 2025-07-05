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
}
