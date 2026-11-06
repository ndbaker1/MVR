import { startAccelerometer, startOrientationTracker } from "@services/sensors";

import { type WebSocketCallbacks, createServerWebSocket } from "../connection";
import type { Pose } from "../data";

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type DynamicClientParameters = {
    host: string,
    callbacks: WebSocketCallbacks,
    autoReconnect?: boolean,
}

export class DynamicClient {
    public ws: WebSocket;
    public readonly id: number;
    public readonly type: string;
    private host: string;
    private autoReconnect: boolean;
    private callbacks: WebSocketCallbacks;

    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionalClose = false;

    private status: ConnectionStatus = 'connecting';
    private onStatusChange?: (status: ConnectionStatus) => void;
    private onDisconnect?: (_: CloseEvent) => void;
    private onReconnect?: () => void;

    private sensorKillHandles: (() => void)[] = [];

    constructor(id: number, { host, callbacks, autoReconnect = true }: DynamicClientParameters, type: string) {
        this.id = id;
        this.type = type;
        this.host = host;
        this.autoReconnect = autoReconnect;
        this.callbacks = callbacks;

        const userClose = callbacks.closeCallback;
        const userError = callbacks.errorCallback;
        const userOpen = callbacks.openCallback;

        this.ws = createServerWebSocket({
            host,
            path: `/${type}/${id}`,
            closeCallback: (e) => { userClose?.(e); this.handleClose(e); },
            errorCallback: (e) => { userError?.(e); this.handleError(); },
            openCallback: (e) => { userOpen?.(e); this.handleOpen(); },
        });
    }

    private setStatus(status: ConnectionStatus) {
        if (this.status === status) return;
        this.status = status;
        this.onStatusChange?.(status);
    }

    private handleOpen = () => {
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        if (wasReconnecting) this.onReconnect?.();
    };

    private handleClose = (e: CloseEvent) => {
        // stop reading from sensors while disconnected
        this.sensorKillHandles.forEach(kill => kill());
        this.sensorKillHandles = [];

        this.setStatus('disconnected');
        if (this.autoReconnect && !this.intentionalClose) {
            // keep the client alive and retry in the background; the UI is
            // driven by status changes (onStatusChange) rather than tearing down
            this.scheduleReconnect();
        } else if (!this.autoReconnect) {
            // permanent loss with no retry configured
            this.onDisconnect?.(e);
        }
        // intentionalClose: the caller (e.g. App re-connecting) manages the UI
    };

    private handleError = () => {
        // errors normally precede a close event; let close handle reconnecting
    };

    private scheduleReconnect = () => {
        this.setStatus('reconnecting');
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => this.reconnect(), delay);
    };

    private reconnect = () => {
        this.reconnectTimer = null;
        this.setStatus('connecting');
        this.intentionalClose = false;

        const newWs = createServerWebSocket({
            host: this.host,
            path: `/${this.type}/${this.id}`,
            closeCallback: (e) => { this.callbacks.closeCallback?.(e); this.handleClose(e); },
            errorCallback: (e) => { this.callbacks.errorCallback?.(e); this.handleError(); },
            openCallback: (e) => { this.callbacks.openCallback?.(e); this.handleOpen(); },
        });
        this.ws = newWs;
        // sensors are re-started by initSensors() which the caller re-invokes,
        // or automatically below so a reconnect is transparent to the UI.
        this.initSensors();
    };

    /** Override to react to a permanent websocket disconnection. */

    public setOnDisconnect(cb: (_: CloseEvent) => void) {
        this.onDisconnect = cb;
    }

    /** Subscribe to connection status changes (connecting/connected/reconnecting/disconnected). */
    public setOnStatusChange(cb: (status: ConnectionStatus) => void) {
        this.onStatusChange = cb;
    }

    /** Subscribe to successful reconnects (useful to re-attach message listeners). */
    public setOnReconnect(cb: () => void) {
        this.onReconnect = cb;
    }

    /** Intentionally close the connection and stop auto-reconnect. Does not
     *  fire onDisconnect — the caller manages UI teardown/re-creation. */
    public disconnect() {
        this.intentionalClose = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.sensorKillHandles.forEach(kill => kill());
        this.sensorKillHandles = [];
        this.ws.close();
    }

    /** Attempt an immediate reconnect. */
    public reconnectNow() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnect();
    }

    public get isConnected() {
        return this.status === 'connected';
    }

    public get isReconnecting() {
        return this.status === 'reconnecting';
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
        // kill any existing sensors first
        this.sensorKillHandles.forEach(kill => kill());
        this.sensorKillHandles = [];

        const stringifySend = (data: any) => this.send(JSON.stringify(data));

        this.sensorKillHandles = await Promise.all([
            startAccelerometer(stringifySend),
            startOrientationTracker(stringifySend),
        ]) as (() => void)[];
    }
}
