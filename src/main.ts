import { CanvasRenderer } from './CanvasRenderer';
import { Utils } from './Utils';
import fragmentShaderText from '/src/test.glsl?raw'

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas, fragmentShaderText);

const statsBl = document.getElementById('stats-bl') as HTMLDivElement;
const statsBr = document.getElementById('stats-br') as HTMLDivElement;
renderer.animator.subscribe(current => {
    statsBl.textContent = current.x + ',' + current.y;
    statsBr.textContent = Utils.formatWithSignificantDigits(current.zoom, 2) + '×';
});
