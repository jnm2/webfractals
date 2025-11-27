import { CanvasRenderer } from './CanvasRenderer';
import { ZoomComponents } from "./ZoomComponents";
import { Utils } from './Utils';
import fragmentShaderText from '/src/test.glsl?raw'
import type { RangedInt } from './RangedInt';

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas, fragmentShaderText);

const statsDiv = document.getElementById('stats') as HTMLDivElement;
renderer.animator.subscribe(current => {
    statsDiv.textContent = Utils.formatWithSignificantDigits(current.zoom, 2) + '×';

    const components = ZoomComponents.fromNumber(current.zoom);
    const hash = '#' + Utils.base64UrlPackIntegers(components.exponent, components.mantissa);
    // Problem: this pollutes browser history. Add link UI instead
    location.replace(('' + window.location).split('#')[0] + hash);
});
