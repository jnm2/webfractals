export class ZoomPanAnimator {
    #zoomOrigin = { x: 0, y: 0 };
    #current = { x: 0, y: 0, zoom: 1 };
    #target = { zoom: 1 };
    #subscribers = new Array<((current: { zoom: number; x: number; y: number; }) => void)>();
    #scheduledFrame: number | null = null;

    get current() {
        return { ...this.#current };
    }

    get target() {
        return { ...this.#target };
    }

    subscribe(callback: (current: { zoom: number; x: number; y: number; }) => void) {
        this.#subscribers.push(callback);
        callback({ ...this.#current });
    }

    #notifySubscribers() {
        for (const subscriber of this.#subscribers) {
            subscriber({ ...this.#current });
        }
    }

    resetZoom(zoom: number) {
        this.#current.zoom = zoom;
        this.#target.zoom = zoom;
        this.#cancelFrame();
        this.#notifySubscribers();
    }

    animateZoom(zoom: number) {
        this.#target.zoom = zoom;
        this.#animate();
    }

    resetPosition(x: number, y: number) {
        this.#current.x = x;
        this.#current.y = y;
        this.#cancelFrame();
        this.#notifySubscribers();
    }

    setZoomOrigin(x: number, y: number) {
        this.#zoomOrigin.x = x;
        this.#zoomOrigin.y = y;
    }

    #animate() {
        this.#cancelFrame();

        let newZoom;
        const animationStepFactor = Math.pow(this.#target.zoom / this.#current.zoom, 0.1);
        if (animationStepFactor > 1.000001 || animationStepFactor < 0.99999) {
            newZoom = this.#current.zoom * animationStepFactor;
            this.#scheduleFrame();
        } else {
            newZoom = this.#target.zoom;
        }

        this.#current.x -= this.#zoomOrigin.x * (newZoom - this.#current.zoom);
        this.#current.y -= this.#zoomOrigin.y * (newZoom - this.#current.zoom);
        this.#current.zoom = newZoom;

        this.#notifySubscribers();
    }

    #scheduleFrame() {
        if (this.#scheduledFrame === null) {
            this.#scheduledFrame = window.requestAnimationFrame(() => {
                this.#scheduledFrame = null;
                return this.#animate();
            });
        }
    }

    #cancelFrame() {
        if (this.#scheduledFrame !== null) {
            window.cancelAnimationFrame(this.#scheduledFrame);
            this.#scheduledFrame = null;
        }
    }
}
