import { IntRanges } from './IntRanges';
import { RangedInt } from './RangedInt';

/**
 * Stores the zoom with two significant decimal places, matching the number shown in the UI.
 */
export class ZoomComponents {
    readonly exponent: RangedInt;
    readonly mantissa: RangedInt;

    static MIN = new ZoomComponents(IntRanges.Zoom.Exponent.min, IntRanges.Zoom.Mantissa.min);
    static MAX = new ZoomComponents(IntRanges.Zoom.Exponent.max, IntRanges.Zoom.Mantissa.max);

    constructor(exponent: number, mantissa: number) {
        this.exponent = new RangedInt(IntRanges.Zoom.Exponent, exponent);
        this.mantissa = new RangedInt(IntRanges.Zoom.Mantissa, mantissa);
    }

    static fromNumber(zoom: number): ZoomComponents {
        zoom = Math.max(Math.min(zoom, ZoomComponents.MAX.toNumber()), ZoomComponents.MIN.toNumber());

        let exponent = Math.floor(Math.log10(zoom)) - 1;
        let mantissa = Math.round(zoom / Math.pow(10, exponent));

        if (mantissa == 100) {
            exponent--;
            mantissa = 10;
        }

        return new ZoomComponents(exponent, mantissa);
    }

    toNumber() {
        return this.mantissa.value * Math.pow(10, this.exponent.value);
    }
}
