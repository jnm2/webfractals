import { CanvasRenderer } from './CanvasRenderer';
import { Utils } from './Utils';
import fragmentShaderText from '/src/test.glsl?raw'

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas, fragmentShaderText);

const statsDiv = document.getElementById('stats') as HTMLDivElement;
renderer.animator.subscribe(current => {
    statsDiv.textContent = Utils.formatWithSignificantDigits(current.zoom, 2) + '×';
});
