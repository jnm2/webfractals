import { ZoomPanAnimator } from "./ZoomPanAnimator";

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
    #dragStartOffset: { pixelLocation: { x: number; y: number }, viewportCenter: { x: number; y: number } } | null = null;

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
        canvas.addEventListener('mousemove', this.#onmousemove.bind(this));
        canvas.addEventListener('pointerdown', this.#onpointerdown.bind(this));
        canvas.addEventListener('pointerup', this.#onpointerup.bind(this));
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

    #onmousemove(event: MouseEvent) {
        if (this.#dragStartOffset) {
            const pixelToSceneScale = this.#getPixelToSceneScale();
            const mouseCoordsToSceneScale = { x: pixelToSceneScale * window.devicePixelRatio, y: pixelToSceneScale * -window.devicePixelRatio };

            this.animator.resetPosition(
                this.#dragStartOffset.viewportCenter.x - (event.clientX - this.#dragStartOffset.pixelLocation.x) * mouseCoordsToSceneScale.x,
                this.#dragStartOffset.viewportCenter.y - (event.clientY - this.#dragStartOffset.pixelLocation.y) * mouseCoordsToSceneScale.y);
        }

        this.animator.setZoomOrigin(
            ((event.clientX * window.devicePixelRatio) - this.#pixelSize!.width / 2) / this.#pixelSize!.height,
            ((event.clientY * -window.devicePixelRatio) + this.#pixelSize!.height / 2) / this.#pixelSize!.height);
    }

    #onpointerdown(event: PointerEvent) {
        if (event.button !== 0)
            return;

        this.#canvas.setPointerCapture(event.pointerId);
        this.#dragStartOffset = {
            pixelLocation: { x: event.clientX, y: event.clientY },
            viewportCenter: { x: this.animator.current.x, y: this.animator.current.y }
        };
    }

    #onpointerup(event: PointerEvent) {
        if (event.button !== 0 || !this.#dragStartOffset)
            return;

        this.#dragStartOffset = null;
        this.#canvas.releasePointerCapture(event.pointerId);
    }

    #onmousewheel(event: WheelEvent) {
        if (event.ctrlKey) return; // User is trying to zoom the UI

        this.animator.animateZoom(this.animator.current.zoom * Math.pow(1.4, Math.sign(event.deltaY)));
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
