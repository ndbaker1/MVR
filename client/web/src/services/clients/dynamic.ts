import { startAccelerometer, startOrientationTracker } from "@services/sensors";

import { type WebSocketCallbacks, createServerWebSocket } from "../connection";
import type { Pose } from "../data";

export type DynamicClientParameters = {
    host: string,
    callbacks: WebSocketCallbacks,
}

export class DynamicClient {
    public ws: WebSocket;

    constructor(public id: number, { host, callbacks }: DynamicClientParameters, type: string) {
        this.ws = createServerWebSocket({
            host,
            path: `/${type}/${id}`,
            ...callbacks,
            closeCallback: (e) => {
                callbacks.closeCallback?.(e);
                this.onDisconnect?.(e);
            },
        });
    }

    /** Override to react to a websocket disconnection (e.g. return to the start page). */
    protected onDisconnect?: (_: CloseEvent) => void;

    public setOnDisconnect(cb: (_: CloseEvent) => void) {
        this.onDisconnect = cb;
    }

    public static asPlayerData(data: unknown): Record<number, Pose> {
        if (typeof data === 'string') {
            return JSON.parse(data);
        }
        throw Error('invalid data');
    }

    // wrapper around websocket send to make it more safe.
    public send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        if (this.ws.readyState === this.ws.CLOSING || this.ws.readyState === this.ws.CLOSED) {
            console.error('connection closed');
        }

        if (this.ws.readyState === this.ws.OPEN) {
            this.ws.send(data);
        }
    };

    public async initSensors() {
        const stringifySend = (data: any) => this.send(JSON.stringify(data));

        const killHandles = await Promise.all([
            startAccelerometer(stringifySend),
            startOrientationTracker(stringifySend),
        ]);

        const onSocketEnd = (e: Event | CloseEvent) => {
            killHandles.forEach(kill => kill());
            if (e instanceof CloseEvent) {
                this.onDisconnect?.(e);
            } else {
                this.onDisconnect?.(e as unknown as CloseEvent);
            }
        };

        this.ws.addEventListener('error', onSocketEnd);
        this.ws.addEventListener('close', onSocketEnd);
    }
}
