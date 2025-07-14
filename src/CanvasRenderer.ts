import { ZoomPanAnimator } from "./ZoomPanAnimator";
import { ZoomPanPointerListener } from "./ZoomPanPointerListener";

export enum ShadingMode {
    None = 0,
    Stepped = 1,
    Smooth = 2,
}

export class CanvasRenderer {
    readonly #canvas: HTMLCanvasElement;
    readonly #context: WebGL2RenderingContext;
    readonly #offsetUniform: WebGLUniformLocation;
    readonly #scaleUniform: WebGLUniformLocation;
    readonly #shadingModeUniform: WebGLUniformLocation;

    readonly animator = new ZoomPanAnimator()

    supersamplingFactor: number = 1;
    shadingMode: ShadingMode = ShadingMode.Smooth;
    #pixelSize?: { width: number; height: number; };

    constructor(canvas: HTMLCanvasElement, fragmentShaderText: string) {
        this.#canvas = canvas;
        this.#context = canvas.getContext("webgl2")!;

        const vertexShader = this.#context.createShader(this.#context.VERTEX_SHADER)!;
        this.#context.shaderSource(vertexShader, `#version 300 es
            in vec2 p;
            void main() { gl_Position = vec4(p, 0, 1); }`);
        this.#context.compileShader(vertexShader);

        const fragmentShader = this.#context.createShader(this.#context.FRAGMENT_SHADER)!;
        this.#context.shaderSource(fragmentShader, fragmentShaderText);
        this.#context.compileShader(fragmentShader);
        if (!this.#context.getShaderParameter(fragmentShader, this.#context.COMPILE_STATUS))
            throw new Error('Fragment shader compilation failed: ' + this.#context.getShaderInfoLog(fragmentShader));

        const shaderProgram = this.#context.createProgram();
        this.#context.attachShader(shaderProgram, vertexShader);
        this.#context.attachShader(shaderProgram, fragmentShader);
        this.#context.linkProgram(shaderProgram);
        this.#context.useProgram(shaderProgram);

        this.#offsetUniform = this.#context.getUniformLocation(shaderProgram, 'offset')!;
        this.#scaleUniform = this.#context.getUniformLocation(shaderProgram, 'scale')!;
        this.#shadingModeUniform = this.#context.getUniformLocation(shaderProgram, 'shadingMode')!;

        const singleCoveringTriangleVertices = [-1, -1, 3, -1, -1, 3];
        const triangleGeometry = this.#context.createBuffer();
        this.#context.bindBuffer(this.#context.ARRAY_BUFFER, triangleGeometry);
        this.#context.bufferData(this.#context.ARRAY_BUFFER, new Float32Array(singleCoveringTriangleVertices), this.#context.STATIC_DRAW);

        const vertexShaderPositionInput = this.#context.getAttribLocation(shaderProgram, 'p');
        this.#context.enableVertexAttribArray(vertexShaderPositionInput);
        this.#context.vertexAttribPointer(vertexShaderPositionInput, 2, this.#context.FLOAT, false, 0, 0);

        new ResizeObserver(this.#setCanvasSize.bind(this)).observe(this.#canvas);
        this.#setCanvasSize();

        this.animator.resetZoom(2);
        this.animator.subscribe(this.draw.bind(this));

        canvas.addEventListener('wheel', this.#onmousewheel.bind(this));
        canvas.addEventListener('pointermove', this.#onpointermove.bind(this));

        new ZoomPanPointerListener(canvas).subscribe(this.#onZoomPanChange.bind(this));
    }

    #setCanvasSize() {
        // Don't use clientWidth/clientHeight, because they are converted from physical pixels to CSS pixels and then
        // rounded to the nearest integer. Instead, use getBoundingClientRect() which returns fractional CSS pixels,
        // and multiply by devicePixelRatio to get physical pixels. This will be a little lossy, but we can use
        // Math.round to recover the actual physical pixel size because we know the canvas is the same size as the
        // viewport and the viewport is always an integer number of physical pixels.
        const clientRect = this.#canvas.getBoundingClientRect();
        const pixelWidth = Math.round(clientRect.width * window.devicePixelRatio) * this.supersamplingFactor;
        const pixelHeight = Math.round(clientRect.height * window.devicePixelRatio) * this.supersamplingFactor;
        this.#pixelSize = { width: pixelWidth, height: pixelHeight };

        this.#canvas.width = pixelWidth;
        this.#canvas.height = pixelHeight;
        this.#context.viewport(0, 0, pixelWidth, pixelHeight);

        this.draw();
    }

    #onpointermove(event: PointerEvent) {
        this.animator.setZoomOrigin(
            ((event.clientX * window.devicePixelRatio) - this.#pixelSize!.width / 2) / this.#pixelSize!.height,
            ((event.clientY * -window.devicePixelRatio) + this.#pixelSize!.height / 2) / this.#pixelSize!.height);
    }

    #onmousewheel(event: WheelEvent) {
        if (event.ctrlKey) return; // User is trying to zoom the UI

        this.animator.animateZoom(this.animator.current.zoom * Math.pow(1.4, Math.sign(event.deltaY)));
    }

    #onZoomPanChange(event: { zoomChangeFactor: number; xChange: number; yChange: number; }) {
        if (event.zoomChangeFactor !== 1)
            this.animator.resetZoom(this.animator.target.zoom / event.zoomChangeFactor);

        const pixelToSceneScale = this.#getPixelToSceneScale();

        this.animator.resetPosition(
            this.animator.current.x - event.xChange * window.devicePixelRatio * pixelToSceneScale,
            this.animator.current.y - event.yChange * -window.devicePixelRatio * pixelToSceneScale);
    }

    #getPixelToSceneScale() {
        return this.animator.current.zoom / this.#pixelSize!.height;
    }

    public draw() {
        const scale = this.#getPixelToSceneScale();
        this.#context.uniform1f(this.#scaleUniform, scale);

        this.#context.uniform2f(
            this.#offsetUniform,
            this.animator.current.x / scale - this.#pixelSize!.width / 2,
            this.animator.current.y / scale - this.#pixelSize!.height / 2);

        this.#context.uniform1i(this.#shadingModeUniform, this.shadingMode);

        this.#context.drawArrays(this.#context.TRIANGLES, 0, 3);
    }
}
