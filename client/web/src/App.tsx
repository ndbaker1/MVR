import React from 'react';
import Editor from '@monaco-editor/react';
import { AccessPoint, FileArrowLeft } from 'tabler-icons-react';
import { ActionIcon, Button, Dialog, Drawer, Flex, Group, Loader, Menu, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

import { EyeClient, RacketClient, ObserverClient } from '@services/clients';
import type { Pose } from '@services/data';
import type { ConnectionStatus } from '@services/clients/dynamic';

import { BASE_PATH, WS_HOST } from './environment';
import { Recorder } from '@services/recorder';

declare global {
    function debug(): void;
}

export type ConnectionConfig = {
    type: 'racket' | 'viewer' | 'none';
    id: number;
    vision: boolean;
    visionTargetId: number | null;
    visionOverlay: boolean;
    enableRightHand: boolean;
};

const StatusBar = ({ clients }: { clients: Map<string, { client: RacketClient | EyeClient; status: ConnectionStatus }> }) => {
    const row = (label: string, status: ConnectionStatus) => {
        const color = status === 'connected' ? '#22c55e' : status === 'reconnecting' ? '#f59e0b' : '#ef4444';
        const text = status === 'connected'
            ? label + ' connected'
            : status === 'reconnecting'
                ? label + ' reconnecting…'
                : label + ' disconnected';
        return (
            <Group spacing={2} align="center">
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block', marginRight: 6 }} />
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", "JetBrainsMono Nerd Font", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 13 }}>{text}</span>
            </Group>
        );
    };
    const rowBox = (children: React.ReactNode) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, backgroundColor: '#111827cc', border: '1px solid #374151' }}>
            {children}
        </div>
    );
    return (
        <Group style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }} spacing={4}>
            <Flex direction={'column'} gap={'xs'}>
                {Array.from(clients.entries()).map(([key, { status }]) => {
                    const [type, id] = key.split(':');
                    return rowBox(row(type + ' ' + id, status));
                })}
            </Flex>
        </Group>
    );
};

const ConnectionSlot = ({
    index,
    config,
    onChange,
}: {
    index: number;
    config: ConnectionConfig;
    onChange: (next: ConnectionConfig) => void;
}) => {
    return (
        <Group spacing="xs">
            <Menu shadow="md">
                <Menu.Target>
                    <Button size="xs">
                        {config.type === 'racket' ? '🏓 Racket' : config.type === 'viewer' ? '👁️ Viewer' : '○ None'}
                    </Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Group spacing="xs">
                        <ActionIcon size="xl" onClick={() => onChange({ ...config, type: 'none' })}>○</ActionIcon>
                        <ActionIcon size="xl" onClick={() => onChange({ ...config, type: 'racket' })}>🏓</ActionIcon>
                        <ActionIcon size="xl" onClick={() => onChange({ ...config, type: 'viewer' })}>👁️</ActionIcon>
                    </Group>
                </Menu.Dropdown>
            </Menu>
            <TextInput
                size="xs"
                placeholder="ID"
                value={config.id.toString()}
                onChange={e => onChange({ ...config, id: parseInt(e.target.value) || 0 })}
                style={{ width: 60 }}
            />
            <ActionIcon
                size="xs"
                onClick={() => onChange({ ...config, vision: !config.vision })}
            >
                {config.vision ? '📹' : '📹'}
            </ActionIcon>
            <span style={{ fontSize: 11, color: config.vision ? '#22c55e' : '#888' }}>
                {config.vision ? 'Vision On' : 'Vision Off'}
            </span>
            {config.vision && (
                <>
                    <TextInput
                        size="xs"
                        placeholder="Target ID"
                        value={config.visionTargetId?.toString() ?? ''}
                        onChange={e => onChange({ ...config, visionTargetId: e.target.value ? parseInt(e.target.value) : null })}
                        style={{ width: 70 }}
                    />
                    <ActionIcon
                        size="xs"
                        onClick={() => onChange({ ...config, visionOverlay: !config.visionOverlay })}
                    >
                        {config.visionOverlay ? '👁️' : '🙈'}
                    </ActionIcon>
                    <span style={{ fontSize: 11, color: config.visionOverlay ? '#22c55e' : '#888' }}>
                        {config.visionOverlay ? 'Overlay On' : 'Overlay Off'}
                    </span>
                    {config.type === 'racket' && (
                        <>
                            <ActionIcon
                                size="xs"
                                onClick={() => onChange({ ...config, enableRightHand: !config.enableRightHand })}
                            >
                                {config.enableRightHand ? '✋' : '☝️'}
                            </ActionIcon>
                            <span style={{ fontSize: 11, color: config.enableRightHand ? '#22c55e' : '#888' }}>
                                {config.enableRightHand ? 'Right Hand' : 'Face/Body'}
                            </span>
                        </>
                    )}
                </>
            )}
        </Group>
    );
};

const App = () => {
    const [debug, setDebug] = React.useState(false);
    const [showEditor, setShowEditor] = React.useState(false);
    const [renderCode, setRenderCode] = React.useState('');
    React.useEffect(() => { window.debug = () => setDebug(true); }, []);

    const [showControl, setShowControl] = React.useState(true);

    // Connection slot configs: up to 4 independently configurable connections
    const [connections, setConnections] = React.useState<ConnectionConfig[]>([
        { type: 'none', id: 0, vision: false, visionTargetId: null, visionOverlay: false, enableRightHand: false },
        { type: 'none', id: 0, vision: false, visionTargetId: null, visionOverlay: false, enableRightHand: false },
        { type: 'none', id: 0, vision: false, visionTargetId: null, visionOverlay: false, enableRightHand: false },
        { type: 'none', id: 0, vision: false, visionTargetId: null, visionOverlay: false, enableRightHand: false },
    ]);

    // Connected clients keyed by "type:id"
    const [clients, setClients] = React.useState<Map<string, {
        client: RacketClient | EyeClient;
        status: ConnectionStatus;
    }>>(new Map());

    const racketVideoRef = React.useRef<HTMLVideoElement>(null);
    const eyeVideoRef = React.useRef<HTMLVideoElement>(null);
    const racketVisionCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const eyeVisionCanvasRef = React.useRef<HTMLCanvasElement>(null);

    const { host, setHost, webSocketHost } = useHost(WS_HOST);

    const connectAll = async () => {
        setShowControl(false);
        await Promise.all(connections.map(async (cfg) => {
            if (cfg.type === 'none') return;
            const key = `${cfg.type}:${cfg.id}`;
            if (clients.has(key)) return; // already connected

            try {
                if (cfg.type === 'racket') {
                    await connectRacket(cfg.id, cfg.vision, cfg.visionTargetId, cfg.visionOverlay, cfg.enableRightHand);
                } else if (cfg.type === 'viewer') {
                    await connectViewer(cfg.id, cfg.vision, cfg.visionTargetId, cfg.visionOverlay);
                }
            } catch (e) {
                console.error(`Failed to connect ${cfg.type} ${cfg.id}:`, e);
            }
        }));
    };

    const connectRacket = async (id: number, vision: boolean, visionTargetId: number | null, visionOverlay: boolean, enableRightHand: boolean) => {
        const client = new RacketClient(id, { host: webSocketHost, callbacks: {} });
        client.setOnStatusChange((status) => {
            setClients(prev => {
                const next = new Map(prev);
                next.set(`racket:${id}`, { client, status });
                return next;
            });
        });
        client.setOnDisconnect(() => {
            setClients(prev => {
                const next = new Map(prev);
                next.delete(`racket:${id}`);
                return next;
            });
        });
        Recorder.capture((im) => client.send(im.data));
        client.initSensors();
        if (vision && racketVideoRef.current) {
            try {
                await client.initVisionForTarget(
                    racketVideoRef.current,
                    visionTargetId ?? undefined,
                    racketVisionCanvasRef.current ?? undefined,
                    { enableRightHand }
                );
            } catch (e) {
                console.error('Failed to start racket webcam vision:', e);
            }
        }
        setClients(prev => {
            const next = new Map(prev);
            next.set(`racket:${id}`, { client, status: 'connected' });
            return next;
        });
    };

    const connectViewer = async (id: number, vision: boolean, visionTargetId: number | null, visionOverlay: boolean) => {
        const client = new EyeClient(id, { host: webSocketHost, callbacks: {} });
        client.setOnStatusChange((status) => {
            setClients(prev => {
                const next = new Map(prev);
                next.set(`viewer:${id}`, { client, status });
                return next;
            });
        });
        client.setOnDisconnect(() => {
            setClients(prev => {
                const next = new Map(prev);
                next.delete(`viewer:${id}`);
                return next;
            });
        });
        Recorder.capture((im) => client.send(im.data));
        client.initSensors();
        if (vision && eyeVideoRef.current) {
            try {
                await client.initVisionForTarget(
                    eyeVideoRef.current,
                    visionTargetId ?? undefined,
                    eyeVisionCanvasRef.current ?? undefined
                );
            } catch (e) {
                console.error('Failed to start viewer webcam vision:', e);
            }
        }
        const view = await initObserverView({ code: renderCode }, new ObserverClient(id, { host: webSocketHost, callbacks: {} }));
        setClients(prev => {
            const next = new Map(prev);
            next.set(`viewer:${id}`, { client, status: 'connected' });
            return next;
        });
        return view.cleanup;
    };

    React.useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const clientType = searchParams.get('client');
        const id = parseInt(searchParams.get('id') || '');
        switch (clientType) {
            case 'racket': connectRacket(id, false, null, false, false); break;
            case 'observer': connectViewer(id, false, null, false); break;
        }
    }, []);

    return (
        <div id="app">
            <StatusBar clients={clients} />
            <Dialog
                opened={showControl}
                size={"min(90vw, 30rem)"}
            >
                <Stack>
                    {debug ? <Button onClick={() => setShowEditor(true)}>Show Editor</Button> : <></>}

                    <Group grow>
                        <Stack spacing="xs">
                            <Text
                                style={{ fontWeight: 'bold', fontSize: 14, color: '#bbb' }}
                            >
                                Configure Connections
                            </Text>
                            {connections.map((cfg, idx) => (
                                <ConnectionSlot
                                    key={idx}
                                    index={idx}
                                    config={cfg}
                                    onChange={next => {
                                        const nextConns = [...connections];
                                        nextConns[idx] = next;
                                        setConnections(nextConns);
                                    }}
                                />
                            ))}
                            <Button
                                onClick={connectAll}
                                disabled={connections.every(c => c.type === 'none')}
                                variant="filled"
                            >
                                Connect All Configured
                            </Button>
                        </Stack>
                    </Group>

                    <Group grow>
                        <TextInput
                            icon={<AccessPoint />}
                            rightSection={
                                <Tooltip label="paste">
                                    <ActionIcon onClick={() => navigator.clipboard.readText().then(setHost)}>
                                        <FileArrowLeft />
                                    </ActionIcon>
                                </Tooltip>
                            }
                            placeholder={WS_HOST}
                            onChange={e => setHost(e.target.value)}
                            width={"100%"}
                            value={host} />
                    </Group>
                </Stack>
            </Dialog>

            {/* Vision tracking overlays - appear on top-left when active */}
            {connections.map((cfg) => {
                if (!cfg.visionOverlay) return null;
                const isRacket = cfg.type === 'racket';
                const videoRef = isRacket ? racketVideoRef : eyeVideoRef;
                const canvasRef = isRacket ? racketVisionCanvasRef : eyeVisionCanvasRef;
                const label = isRacket ? 'Racket' : 'Viewer';
                const borderColor = isRacket ? '#00ff00' : '#00ffff';
                return (
                    <div
                        key={cfg.type + cfg.id}
                        style={{
                            position: 'fixed',
                            top: cfg.type === 'racket' ? 10 : 290,
                            left: 10,
                            zIndex: 2000,
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                background: 'rgba(0,0,0,0.8)',
                                border: `2px solid ${borderColor}`,
                                borderRadius: 8,
                                padding: 4,
                                pointerEvents: 'auto',
                            }}
                        >
                            <div style={{ color: borderColor, fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
                                {`📹 ${label} Vision Overlay (tracking device #${cfg.visionTargetId ?? 'self'})`}
                            </div>
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }}
                            />
                            <canvas
                                ref={canvasRef}
                                style={{ width: '100%', height: 'auto', position: 'absolute', top: 0, left: 0, transform: 'scaleX(-1)' }}
                            />
                        </div>
                    </div>
                );
            })}

            <Drawer
                position="right"
                size="60vw"
                opened={showEditor}
                onClose={() => setShowEditor(false)}
            >
                <Editor
                    value={renderCode}
                    onChange={value => setRenderCode(value ?? '')}
                    language="javascript"
                    theme="vs-dark"
                />
            </Drawer>
            <main id="screen"></main>
        </div>
    );
};

function useHost(defaultHostInput: string) {
    const [host, setHost] = React.useState('');
    const webSocketHost = (host || defaultHostInput).replaceAll(/.*:\/\/|\/$/gi, '');
    return { host, setHost, webSocketHost };
}

type RenderParameters = {
    code?: string
}

async function loadMeshes() {
    const loader = new OBJLoader();
    const material = new THREE.MeshNormalMaterial();

    const groups = await Promise.all([
        loader.loadAsync(`${BASE_PATH}/assets/models.obj`),
        loader.loadAsync(`${BASE_PATH}/assets/table.obj`),
    ]);

    for (const group of groups) {
        group.traverse(obj => obj instanceof THREE.Mesh && (obj.material = material));
    }
    const [objectGroup, tableGroup] = groups;

    const ballMesh = objectGroup.getObjectByName('ball') as THREE.Mesh;
    const racketMesh = objectGroup.getObjectByName('racket') as THREE.Mesh;
    const headMesh = objectGroup.getObjectByName('head') as THREE.Mesh;

    return {
        ballMesh,
        racketMesh,
        headMesh,
        tableGroup,
    };
}

async function initObserverView(parameters: RenderParameters, observerClient: ObserverClient) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 0, 0);
    camera.lookAt(0, 0, 0);

    const { tableGroup, racketMesh, headMesh } = await loadMeshes();

    scene.add(tableGroup);
    const meshes = new Map<number, THREE.Mesh>();
    const debugSpheres = new Map<number, { sphere: THREE.Mesh; sprite: THREE.Sprite }>();
    const createMesh = (id: number) => {
        if (id % 3 == 0) {
            return racketMesh.clone();
        } else if (id % 3 == 1) {
            return headMesh.clone();
        } else {
            throw new Error('dont recieve events from observers');
        }
    };

    // Debug visualization: coordinate axes
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Debug visualization: create a labeled sphere for each device pose
    const createDebugSphere = (id: number, pose: Pose) => {
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const color = id === observerClient.id ? 0x00ffff : (id % 3 === 0 ? 0xff0000 : 0x00ff00);
        const material = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.8 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.fromArray(pose.position);
        sphere.quaternion.fromArray(pose.orientation);
        scene.add(sphere);

        // Add text label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.textAlign = 'center';
        ctx.fillText(`Device ${id}`, 128, 40);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.5, 0.125, 1);
        sprite.position.copy(sphere.position);
        sprite.position.y += 0.1;
        scene.add(sprite);
        return { sphere, sprite };
    };

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animation);
    const screen = document.querySelector('main[id="screen"]');
    if (screen) {
        screen.replaceChildren(renderer.domElement);
    } else {
        throw Error('failed to replace screen with renderer.');
    }

    const observerRender: (id: number, playerPose: Pose, object?: THREE.Mesh) => void = !!parameters.code
        ? new Function('id', 'playerData', 'object', parameters.code) as any
        : (id, playerPose, object) => {
            if (id == observerClient.id) {
                camera.quaternion.fromArray(playerPose.orientation);
                camera.position.fromArray(playerPose.position);
            } else {
                if (object) {
                    object.quaternion.fromArray(playerPose.orientation);
                    object.position.fromArray(playerPose.position);
                } else {
                    console.error(`no mesh provided for body that needs to be drawn with id [${id}]`);
                }
            }
        };

    const update = (updates: Record<string, Pose>) => {
        Object.entries(updates).forEach(([idKey, playerPose]) => {
            const id = parseInt(idKey);
            if (!meshes.has(id) && observerClient.id != id) {
                const mesh = createMesh(id);
                meshes.set(id, mesh);
                scene.add(mesh);
                console.log('created mesh for id', id);
            }
            observerRender(id, playerPose, meshes.get(id)!);

            // Update or create debug sphere for this pose
            if (!debugSpheres.has(id)) {
                debugSpheres.set(id, createDebugSphere(id, playerPose));
            } else {
                const { sphere, sprite } = debugSpheres.get(id)!;
                sphere.position.fromArray(playerPose.position);
                sphere.quaternion.fromArray(playerPose.orientation);
                sprite.position.copy(sphere.position);
                sprite.position.y += 0.1;
            }
        });
    };

    observerClient.ws.addEventListener('message', ({ data }) => update(EyeClient.asPlayerPose(data)));

    // re-attach the message listener if the observer socket reconnects
    observerClient.setOnReconnect(() => {
        observerClient.ws.addEventListener('message', ({ data }) => update(EyeClient.asPlayerPose(data)));
    });

    function animation(_time: number) {
        renderer.render(scene, camera);
    }

    const cleanup = () => {
        renderer.setAnimationLoop(null);
        renderer.renderLists.dispose();
        // Clear the canvas by drawing a blank frame
        renderer.clear();
        const screen = document.querySelector('main[id="screen"]');
        if (screen) {
            screen.replaceChildren();
        }
        renderer.dispose();
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.MeshNormalMaterial) {
                    object.material.dispose();
                } else if (object.material instanceof THREE.MeshBasicMaterial) {
                    object.material.dispose();
                }
                if (object.material instanceof THREE.SpriteMaterial) {
                    object.material.map?.dispose();
                    object.material.dispose();
                }
            } else if (object instanceof THREE.Sprite) {
                object.material.map?.dispose();
                object.material.dispose();
            }
        });
    };

    return { cleanup };
}

export default App;
