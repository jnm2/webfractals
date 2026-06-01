export class ZoomPanEvent {
    constructor(
        readonly scale: number, 
        readonly translate: { readonly x: number, readonly y: number })
    {        
    }
}

export class ZoomPanPointerListener {
    readonly #downPointers = new Map<number, { x: number; y: number; }>();
    #midpoint: { x: number; y: number; rmsDistance: number; } | null = null;
    #subscribers = new Array<((event: ZoomPanEvent) => void)>();

    constructor(element: HTMLElement) {
        element.addEventListener('pointerdown', this.#onPointerDown.bind(this));
        element.addEventListener('pointerup', this.#onPointerUp.bind(this));
        element.addEventListener('pointercancel', this.#onPointerUp.bind(this));
        element.addEventListener('pointermove', this.#onPointerMove.bind(this));
    }

    subscribe(callback: (event: ZoomPanEvent) => void) {
        this.#subscribers.push(callback);
    }

    #notifySubscribers(event: ZoomPanEvent) {
        for (const subscriber of this.#subscribers) {
            subscriber({ ...event });
        }
    }

    #onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

        this.#downPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.#midpoint = this.#getMidpointAndRmsDistance();
    }

    #onPointerUp(event: PointerEvent) {
        this.#downPointers.delete(event.pointerId);

        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);

        this.#midpoint = this.#getMidpointAndRmsDistance();
    }

    #getMidpointAndRmsDistance() {
        if (this.#downPointers.size === 0) {
            return null;
        }

        let sumX = 0, sumY = 0;
        for (const { x, y } of this.#downPointers.values()) {
            sumX += x;
            sumY += y;
        }

        const midpoint = { x: sumX / this.#downPointers.size, y: sumY / this.#downPointers.size };

        let rmsSum = 0;
        for (const pointer of this.#downPointers.values()) {
            const dx = pointer.x - midpoint.x;
            const dy = pointer.y - midpoint.y;
            rmsSum += dx * dx + dy * dy;
        }

        return { ...midpoint, rmsDistance: Math.sqrt(rmsSum / this.#downPointers.size) };
    }

    #onPointerMove(event: PointerEvent) {
        const pointer = this.#downPointers.get(event.pointerId);
        if (!pointer) return;

        pointer.x = event.clientX;
        pointer.y = event.clientY;

        const oldMidpoint = this.#midpoint!;
        this.#midpoint = this.#getMidpointAndRmsDistance()!;

        const zoomChangeFactor = oldMidpoint.rmsDistance === 0 ? 1 : this.#midpoint.rmsDistance / oldMidpoint.rmsDistance;

        // The listeners will be concerned with zooming and panning something in response to this event. Taking on the point of
        // view of the listeners, two approaches are exactly equivalent for them:
        // A) First applying just the zoom part of the change using starting pointer point as the zoom origin, then applying
        //    just the offset part of the change using the new zoom level.
        // B) Or, first applying just the offset part of the change using the starting zoom level, then applying just the zoom
        //    part of the change using the ending pointer point as the zoom origin.
        // Both of these require listeners to consider five pieces of information: the zoom change factor, the starting average
        // pointer position (x and y), and the ending average pointer position (x and y).
        //
        // That should feel redundant. The overall effect is independent of absolute pointer positions, so why should listeners
        // be reasoning about absolute pointer positions, by being forced to use them as an origin when applying the zoom part
        // of the change?
        // 
        // Instead of that, we can send just _three_ pieces of information instead by noticing the redundancy above. The
        // redundancy is that we can choose any origin for the zoom, and compensate for that choice by manipulating the pan.
        // Conversely, we can choose any pan, and compensate for that choice by manipulating the zoom origin.
        //
        // So, instead of A or B, we choose the zoom origin to be (0, 0) and we adjust the pan change accordingly so that the
        // overall effect is still exactly equivalent to A and B. Now, two of the five pieces of information are always zero by
        // convention and thus don't need to be passed. Listeners will now need to understand that the new pan is no longer
        // a screen-space displacement of the midpoint, but the translation component of the gesture's affine map p ↦ s·p + t:
        // the pixel offset that, applied after scaling about (0, 0), reproduces the gesture. Equivalently, it's where (0, 0)
        // ends up.

        this.#notifySubscribers(new ZoomPanEvent(
            zoomChangeFactor,
            {
                x: this.#midpoint.x - zoomChangeFactor * oldMidpoint.x, 
                y: this.#midpoint.y - zoomChangeFactor * oldMidpoint.y
            }));
    }
}
