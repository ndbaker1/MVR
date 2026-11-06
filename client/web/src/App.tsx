import React from 'react';
import Editor from '@monaco-editor/react';
import { AccessPoint, FileArrowLeft } from 'tabler-icons-react';
import { ActionIcon, Button, Dialog, Drawer, Flex, Group, Loader, Menu, SimpleGrid, Stack, TextInput, Tooltip } from '@mantine/core';
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

const StatusBar = ({ racketStatus, eyeStatus }: { racketStatus: ConnectionStatus; eyeStatus: ConnectionStatus }) => {
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
                <span style={{ color: '#ffffff', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 13 }}>{text}</span>
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
                {rowBox(row('racket', racketStatus))}
                {rowBox(row('view', eyeStatus))}
            </Flex>
        </Group>
    );
};

const App = () => {
    const [debug, setDebug] = React.useState(false);
    const [showEditor, setShowEditor] = React.useState(false);
    const [renderCode, setRenderCode] = React.useState('');
    React.useEffect(() => { window.debug = () => setDebug(true); }, []);

    const [showControl, setShowControl] = React.useState(true);

    const [racketClient, setRacketClient] = React.useState<RacketClient>();
    const [racketClientLoading, setRacketClientLoading] = React.useState(false);
    const [racketStatus, setRacketStatus] = React.useState<ConnectionStatus>('disconnected');
    const [eyeClient, setEyeClient] = React.useState<EyeClient>();
    const [eyeClientLoading, setEyeClientLoading] = React.useState(false);
    const [eyeStatus, setEyeStatus] = React.useState<ConnectionStatus>('disconnected');

    const { host, setHost, webSocketHost } = useHost(WS_HOST);

    const loadObserver = (i: number) => {
        setShowControl(false);
        setEyeClientLoading(true);
        let observerCleanup: (() => void) | undefined;
        const updateObserverClient = async () => {
            const client = new EyeClient(i - 1, { host: webSocketHost, callbacks: {} });
            client.setOnStatusChange((status) => setEyeStatus(status));
            client.setOnDisconnect(() => {
                // permanent loss: tear down and return to the connect screen
                observerCleanup?.();
                setShowControl(true);
                setEyeClient(undefined);
                setEyeClientLoading(false);
                setEyeStatus('disconnected');
            });
            Recorder.capture((im) => client.send(im.data));
            client.initSensors();
            const view = await initObserverView({ code: renderCode }, new ObserverClient(i, { host: webSocketHost, callbacks: {} }));
            observerCleanup = view.cleanup;
            setEyeClient(client);
            setEyeClientLoading(false);
        };
        if (eyeClient && eyeClient.ws.readyState !== WebSocket.CLOSED) {
            eyeClient.disconnect();
            eyeClient.ws.addEventListener('close', updateObserverClient, { once: true });
        } else {
            updateObserverClient();
        }
    };

    const loadRacket = (i: number) => {
        setShowControl(false);
        setRacketClientLoading(true);
        const updateRacketClient = () => {
            const client = new RacketClient(i, { host: webSocketHost, callbacks: {} });
            client.setOnStatusChange((status) => setRacketStatus(status));
            client.setOnDisconnect(() => {
                // permanent loss: tear down and return to the connect screen
                setShowControl(true);
                setRacketClient(undefined);
                setRacketClientLoading(false);
                setRacketStatus('disconnected');
            });
            Recorder.capture((im) => client.send(im.data));
            client.initSensors();
            setRacketClient(client);
            setRacketClientLoading(false);
        };
        if (racketClient && racketClient.ws.readyState !== WebSocket.CLOSED) {
            racketClient.disconnect();
            racketClient.ws.addEventListener('close', updateRacketClient, { once: true });
        } else {
            updateRacketClient();
        }
    };

    React.useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const clientType = searchParams.get('client');
        const id = parseInt(searchParams.get('id') || '');
        switch (clientType) {
            case 'racket': loadRacket(id); break;
            case 'observer': loadObserver(id); break;
        }
    }, []);

    return (
        <div id="app">
            <StatusBar racketStatus={racketStatus} eyeStatus={eyeStatus} />
            <Dialog
                opened={showControl}
                size={"min(90vw, 30rem)"}
            >
                <Stack>
                    {debug ? <Button onClick={() => setShowEditor(true)}>Show Editor</Button> : <></>}
                    <Group grow>
                        <Menu shadow="md">
                            <Menu.Target>
                                <Button>
                                    {eyeClientLoading
                                        ? <Loader color={"white"} size={"sm"} />
                                        : eyeClient ? `View ${eyeClient.id + 1}` : "Connect View"
                                    }
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <SimpleGrid cols={3}>
                                    {Array(4).fill(0).map((_, i) => i * 3 + 2).map(i =>
                                        <Group grow key={i}>
                                            <ActionIcon
                                                size="xl"
                                                onClick={() => loadObserver(i)}
                                            >
                                                {i}
                                            </ActionIcon>
                                        </Group>
                                    )}
                                </SimpleGrid>
                            </Menu.Dropdown>
                        </Menu>

                        <Menu shadow="md">
                            <Menu.Target>
                                <Button>
                                    {racketClientLoading
                                        ? <Loader color={"white"} size={"sm"} />
                                        : racketClient ? `Racket ${racketClient.id}` : "Connect Racket"
                                    }
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <SimpleGrid cols={3}>
                                    {Array(4).fill(0).map((_, i) => i * 3).map(i =>
                                        <Group grow key={i}>
                                            <ActionIcon
                                                size="xl"
                                                onClick={() => loadRacket(i)}
                                            >
                                                {i}
                                            </ActionIcon>
                                        </Group>
                                    )}
                                </SimpleGrid>
                            </Menu.Dropdown>
                        </Menu>
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
    const createMesh = (id: number) => {
        if (id % 3 == 0) {
            return racketMesh.clone();
        } else if (id % 3 == 1) {
            return headMesh.clone();
        } else {
            throw new Error('dont recieve events from observers');
        }
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
            if (id == observerClient.id - 1) {
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
                }
            }
        });
    };

    return { cleanup };
}

export default App;
