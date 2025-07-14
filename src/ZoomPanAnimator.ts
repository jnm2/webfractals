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
        this.#scheduleFrame(true);
    }

    animateZoom(zoom: number) {
        this.#target.zoom = zoom;
        this.#scheduleFrame(false);
    }

    resetPosition(x: number, y: number) {
        this.#current.x = x;
        this.#current.y = y;
        this.#scheduleFrame(true);
    }

    setZoomOrigin(x: number, y: number) {
        this.#zoomOrigin.x = x;
        this.#zoomOrigin.y = y;
    }

    #animate() {
        let newZoom;
        const animationStepFactor = Math.pow(this.#target.zoom / this.#current.zoom, 0.1);
        if (animationStepFactor > 1.000001 || animationStepFactor < 0.99999) {
            newZoom = this.#current.zoom * animationStepFactor;
            this.#scheduleFrame(false);
        } else {
            newZoom = this.#target.zoom;
        }

        this.#current.x -= this.#zoomOrigin.x * (newZoom - this.#current.zoom);
        this.#current.y -= this.#zoomOrigin.y * (newZoom - this.#current.zoom);
        this.#current.zoom = newZoom;

        this.#notifySubscribers();
    }

    #scheduleFrame(resetOnNextFrame: boolean) {
        if (this.#scheduledFrame === null) {
            this.#scheduledFrame = window.requestAnimationFrame(() => {
                this.#scheduledFrame = null;
                if (resetOnNextFrame)
                    this.#notifySubscribers();
                else
                    this.#animate();
            });
        }
    }
}
