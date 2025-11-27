import type { IntRange } from "./IntRange";

export class RangedInt {
    constructor(
        public readonly range: IntRange,
        public readonly value: number
    ) {
        if (!Number.isInteger(value)) throw new TypeError('Value must be an integer.');
        if (value < this.range.min || value > this.range.max) throw new RangeError('Value must be between min and max, inclusive.');
    }
}
