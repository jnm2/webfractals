export class IntRange {
    constructor(
        public readonly min: number,
        public readonly max: number
    ) {
        if (!Number.isInteger(min)) throw new TypeError('Min must be an integer.');
        if (!Number.isInteger(max)) throw new TypeError('Max must be an integer.');
        if (min > max) throw new RangeError('Min must be less than or equal to max.');
    }

    get inclusiveSize() {
        return this.max - this.min + 1;
    }
}
