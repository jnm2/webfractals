export class ZoomPanPointerListener {
    readonly #downPointers = new Map<number, { x: number; y: number; }>();
    #midpoint: { x: number; y: number; rmsDistance: number; } | null = null;
    #subscribers = new Array<((event: { zoomChangeFactor: number; xChange: number; yChange: number; }) => void)>();

    constructor(element: HTMLElement) {
        element.addEventListener('pointerdown', this.#onPointerDown.bind(this));
        element.addEventListener('pointerup', this.#onPointerUp.bind(this));
        element.addEventListener('pointercancel', this.#onPointerUp.bind(this));
        element.addEventListener('pointermove', this.#onPointerMove.bind(this));
    }

    subscribe(callback: (event: { zoomChangeFactor: number; xChange: number; yChange: number; }) => void) {
        this.#subscribers.push(callback);
    }

    #notifySubscribers(event: { zoomChangeFactor: number; xChange: number; yChange: number; }) {
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

        this.#notifySubscribers({
            zoomChangeFactor: oldMidpoint.rmsDistance === 0 ? 1 : this.#midpoint.rmsDistance / oldMidpoint.rmsDistance,
            xChange: this.#midpoint.x - oldMidpoint.x,
            yChange: this.#midpoint.y - oldMidpoint.y
        });
    }
}
