import {
    FilesetResolver,
    PoseLandmarker,
    FaceLandmarker,
    DrawingUtils,
    NormalizedLandmark,
    PoseLandmarkerResult,
    FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

// Connection type from MediaPipe Tasks Vision (not explicitly exported, re-declare)
type Connection = { start: number; end: number };

export type VisionLandmarks = {
    pose: NormalizedLandmark[] | null;
    face: NormalizedLandmark[] | null;
    imageWidth: number;
    imageHeight: number;
};

export type VisionPose = {
    position: [number, number, number];
    orientation: [number, number, number, number];
    depth: number; // meters (Z distance from camera)
    target_id?: number; // if set, this vision pose is for another device
    source?: 'face' | 'pose' | 'right-hand'; // which landmark source was used
};

export type VisionSensorCallbacks = {
    onPose?: (pose: VisionPose) => void;
    onLandmarks?: (landmarks: VisionLandmarks) => void;
    onError?: (error: Error) => void;
};

export type VisionSensorConfig = {
    enablePose: boolean;
    enableFace: boolean;
    enableRightHand: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
};

// MediaPipe model file URLs (served from CDN)
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Average inter-pupillary distance in meters (~6.3 cm)
const AVG_IPD_M = 0.063;

// Face Mesh landmark indices for eye corners (MediaPipe Face Landmarker 478-point model)
// Left eye outer/inner corners, Right eye inner/outer corners
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;

// MediaPipe Pose landmark indices (33 landmarks)
const POSE_RIGHT_WRIST = 16;
const POSE_RIGHT_INDEX = 20;
const POSE_RIGHT_PINKY = 18;
const POSE_RIGHT_THUMB = 22;
const POSE_LEFT_WRIST = 15;
const POSE_LEFT_INDEX = 19;
const POSE_LEFT_PINKY = 17;
const POSE_LEFT_THUMB = 21;
const POSE_RIGHT_SHOULDER = 12;
const POSE_LEFT_SHOULDER = 11;
const POSE_NOSE = 0;

export class VisionSensor {
    private video: HTMLVideoElement | null = null;
    private poseLandmarker: PoseLandmarker | null = null;
    private faceLandmarker: FaceLandmarker | null = null;
    private drawingUtils: DrawingUtils | null = null;
    private running = false;
    private frameTimestamp = 0;

    // Optional canvas for drawing tracking overlay
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    private callbacks: VisionSensorCallbacks;

    // Camera intrinsics (approximate for 720p, 60° HFOV)
    // focal length in pixels: f = (width / 2) / tan(HFOV / 2)
    private readonly focalLength: number;
    private readonly principalPoint: [number, number];

    private config: VisionSensorConfig = {
        enablePose: true,
        enableFace: true,
        enableRightHand: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    };

    constructor(callbacks: VisionSensorCallbacks, config?: Partial<VisionSensorConfig>) {
        this.callbacks = callbacks;
        if (config) this.config = { ...this.config, ...config };

        // Default config: 720p width, 60° HFOV
        const width = 1280;
        const hfovRad = (60 * Math.PI) / 180;
        this.focalLength = (width / 2) / Math.tan(hfovRad / 2);
        this.principalPoint = [width / 2, 720 / 2]; // cx, cy
    }

    async start(videoElement: HTMLVideoElement): Promise<void> {
        if (this.running) return;

        this.video = videoElement;

        // Request webcam access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            this.video.srcObject = stream;
            await new Promise<void>((resolve) => {
                this.video!.onloadedmetadata = () => {
                    this.initDrawingUtils();
                    resolve();
                };
            });
        } catch (err) {
            this.callbacks.onError?.(
                err instanceof Error ? err : new Error('Failed to access webcam')
            );
            return;
        }

        // Initialize MediaPipe Tasks Vision
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
        );

        // Initialize Pose Landmarker (video mode for streaming)
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: POSE_MODEL_URL,
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
        });

        // Initialize Face Landmarker (video mode for streaming)
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: FACE_MODEL_URL,
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        });

        this.running = true;
        this.processFrame();
    }

    stop(): void {
        this.running = false;
        if (this.poseLandmarker) {
            this.poseLandmarker.close();
            this.poseLandmarker = null;
        }
        if (this.faceLandmarker) {
            this.faceLandmarker.close();
            this.faceLandmarker = null;
        }
        if (this.video) {
            const stream = this.video.srcObject as MediaStream | null;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            this.video.srcObject = null;
            this.video = null;
        }
    }

    /** Set the canvas element to draw tracking overlay on */
    public setCanvas(canvas: HTMLCanvasElement | null) {
        this.canvas = canvas;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        if (this.ctx && canvas) {
            this.drawingUtils = new DrawingUtils(this.ctx);
            canvas.width = this.video?.videoWidth ?? 640;
            canvas.height = this.video?.videoHeight ?? 480;
        }
    }

    /** Initialize drawing utils when video metadata is available */
    private initDrawingUtils(): void {
        if (this.canvas && this.ctx && this.video) {
            this.drawingUtils = new DrawingUtils(this.ctx);
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        }
    }

    private isRunning(): boolean {
        return this.running && this.video !== null && this.poseLandmarker !== null && this.faceLandmarker !== null;
    }

    private processFrame(): void {
        if (!this.isRunning()) return;

        const video = this.video!;
        const timestamp = this.frameTimestamp++;

        // Run pose detection
        const poseResult = this.poseLandmarker!.detectForVideo(video, timestamp);
        // Run face detection
        const faceResult = this.faceLandmarker!.detectForVideo(video, timestamp);

        this.onResults(poseResult, faceResult);

        requestAnimationFrame(() => this.processFrame());
    }

    private onResults(poseResult: PoseLandmarkerResult, faceResult: FaceLandmarkerResult): void {
        // Get first detected pose/face
        const poseLandmarks = poseResult.landmarks?.[0] ?? null;
        const faceLandmarks = faceResult.faceLandmarks?.[0] ?? null;

        // Draw tracking overlay if canvas available
        this.drawTrackingOverlay(poseLandmarks, faceLandmarks);

        if (!poseLandmarks && !faceLandmarks) return;

        const visionPose = this.computePose(poseLandmarks, faceLandmarks);
        this.callbacks.onPose?.(visionPose);

        const video = this.video!;
        this.callbacks.onLandmarks?.({
            pose: poseLandmarks,
            face: faceLandmarks,
            imageWidth: video.videoWidth,
            imageHeight: video.videoHeight,
        });
    }

    private drawTrackingOverlay(
        poseLandmarks: NormalizedLandmark[] | null,
        faceLandmarks: NormalizedLandmark[] | null
    ): void {
        if (!this.drawingUtils || !this.ctx || !this.canvas || !this.video) return;

        const { ctx, canvas, video } = this;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the video frame as background
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw pose landmarks and connections
        if (poseLandmarks) {
            this.drawingUtils.drawConnectors(poseLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#00ff00',
                lineWidth: 2,
            });
            this.drawingUtils.drawLandmarks(poseLandmarks, {
                color: '#ff0000',
                fillColor: '#ff0000',
                lineWidth: 1,
                radius: 3,
            });

            // Highlight right hand if enabled
            if (this.config.enableRightHand && poseLandmarks.length >= 33) {
                const rightWrist = poseLandmarks[POSE_RIGHT_WRIST];
                const rightIndex = poseLandmarks[POSE_RIGHT_INDEX];
                const rightPinky = poseLandmarks[POSE_RIGHT_PINKY];
                const rightThumb = poseLandmarks[POSE_RIGHT_THUMB];
                this.drawingUtils.drawLandmarks([rightWrist, rightIndex, rightPinky, rightThumb], {
                    color: '#ffff00',
                    fillColor: '#ffff00',
                    lineWidth: 2,
                    radius: 6,
                });
            }
        }

        // Draw face mesh contours
        if (faceLandmarks) {
            this.drawingUtils.drawConnectors(faceLandmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                color: '#70c170',
                lineWidth: 1,
            });
            this.drawingUtils.drawConnectors(faceLandmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
                color: '#00ffff',
                lineWidth: 1,
            });
        }
    }

    private computePose(
        poseLandmarks: NormalizedLandmark[] | null,
        faceLandmarks: NormalizedLandmark[] | null
    ): VisionPose {
        // Default: no depth, no position
        let depth = 0;
        let position: [number, number, number] = [0, 0, 0];
        let orientation: [number, number, number, number] = [1, 0, 0, 0];
        let source: 'face' | 'pose' | 'right-hand' | undefined;

        // Priority 1: Right hand tracking (for racket)
        if (this.config.enableRightHand && poseLandmarks && poseLandmarks.length >= 33) {
            const rightWrist = poseLandmarks[POSE_RIGHT_WRIST];
            const rightIndex = poseLandmarks[POSE_RIGHT_INDEX];
            const rightPinky = poseLandmarks[POSE_RIGHT_PINKY];
            const rightThumb = poseLandmarks[POSE_RIGHT_THUMB];
            const rightShoulder = poseLandmarks[POSE_RIGHT_SHOULDER];

            // Use wrist as primary reference point for racket position
            const wrist = rightWrist;

            // Estimate depth from hand size (wrist to middle finger tip approx 0.18m)
            const handSizePx = Math.hypot(
                (rightIndex.x - rightWrist.x) * this.video!.videoWidth,
                (rightIndex.y - rightWrist.y) * this.video!.videoHeight
            );
            if (handSizePx > 5) {
                depth = (0.18 * this.focalLength) / handSizePx;
            } else {
                // Fallback: estimate from shoulder-to-wrist distance (~0.6m arm length)
                const armLengthPx = Math.hypot(
                    (rightWrist.x - rightShoulder.x) * this.video!.videoWidth,
                    (rightWrist.y - rightShoulder.y) * this.video!.videoHeight
                );
                if (armLengthPx > 5) {
                    depth = (0.6 * this.focalLength) / armLengthPx;
                }
            }

            if (depth > 0) {
                const cx = this.principalPoint[0];
                const cy = this.principalPoint[1];
                position[0] = ((wrist.x * this.video!.videoWidth - cx) * depth) / this.focalLength;
                // Negate Y: camera space (Y down) -> Three.js world space (Y up)
                position[1] = -((wrist.y * this.video!.videoHeight - cy) * depth) / this.focalLength;
                position[2] = depth;

                // Orientation from hand plane (wrist -> index finger direction)
                // Hand pointing direction in image -> yaw around Y
                const handDx = rightIndex.x - rightWrist.x;
                const handDy = rightIndex.y - rightWrist.y;
                const yaw = Math.atan2(handDy, handDx);
                const halfYaw = -yaw / 2;
                orientation = [
                    Math.cos(halfYaw),
                    0,
                    Math.sin(halfYaw),
                    0,
                ];
                source = 'right-hand';
            }
        }

        // Priority 2: Face landmarks (for viewer/head tracking)
        if (depth === 0 && faceLandmarks && faceLandmarks.length >= 468) {
            const leftOuter = faceLandmarks[LEFT_EYE_OUTER];
            const leftInner = faceLandmarks[LEFT_EYE_INNER];
            const rightInner = faceLandmarks[RIGHT_EYE_INNER];
            const rightOuter = faceLandmarks[RIGHT_EYE_OUTER];

            // Inter-pupillary distance in pixels (normalized coordinates * image width)
            const ipdPx = (rightInner.x - leftInner.x) * this.video!.videoWidth;
            if (ipdPx > 0) {
                depth = (AVG_IPD_M * this.focalLength) / ipdPx;
            }

            // Face center in normalized coords
            const faceCenterX = (leftOuter.x + rightOuter.x) / 2;
            const faceCenterY = (leftOuter.y + rightOuter.y) / 2;

            // Convert to camera-relative position (meters)
            // Camera coordinate system: X right, Y down, Z forward
            // Three.js uses: X right, Y up, Z back
            const cx = this.principalPoint[0];
            const cy = this.principalPoint[1];
            position[0] = ((faceCenterX * this.video!.videoWidth - cx) * depth) / this.focalLength;
            // Negate Y: camera space (Y down) -> Three.js world space (Y up)
            position[1] = -((faceCenterY * this.video!.videoHeight - cy) * depth) / this.focalLength;
            position[2] = depth;

            // Compute face orientation from eye line and face position
            // Horizontal face offset -> yaw (left/right head turn)
            const yaw = ((faceCenterX * this.video!.videoWidth - cx) / this.focalLength) * 0.8;
            // Vertical face offset -> pitch (up/down head tilt)
            const pitch = -((faceCenterY * this.video!.videoHeight - cy) / this.focalLength) * 0.8;
            // Eye line angle -> roll (head tilt)
            const eyeDx = rightInner.x - leftInner.x;
            const eyeDy = rightInner.y - leftInner.y;
            const roll = -Math.atan2(eyeDy, eyeDx);

            // Build quaternion from Euler angles (yaw around Y, pitch around X, roll around Z)
            // Order: Y (yaw) -> X (pitch) -> Z (roll)
            const cy2 = Math.cos(yaw * 0.5);
            const sy2 = Math.sin(yaw * 0.5);
            const cp2 = Math.cos(pitch * 0.5);
            const sp2 = Math.sin(pitch * 0.5);
            const cr2 = Math.cos(roll * 0.5);
            const sr2 = Math.sin(roll * 0.5);

            orientation = [
                cr2 * cp2 * cy2 + sr2 * sp2 * sy2, // w
                sr2 * cp2 * cy2 - cr2 * sp2 * sy2, // x (pitch)
                cr2 * sp2 * cy2 + sr2 * cp2 * sy2, // y (yaw)
                cr2 * cp2 * sy2 - sr2 * sp2 * cy2, // z (roll)
            ];
            // Normalize quaternion
            const len = Math.sqrt(orientation[0]**2 + orientation[1]**2 + orientation[2]**2 + orientation[3]**2);
            orientation = [orientation[0]/len, orientation[1]/len, orientation[2]/len, orientation[3]/len];
            source = 'face';
        }

        // Priority 3: Pose landmarks (fallback)
        if (depth === 0 && poseLandmarks && poseLandmarks.length >= 33) {
            // Use nose as reference point
            const nose = poseLandmarks[0];
            const leftShoulder = poseLandmarks[11];
            const rightShoulder = poseLandmarks[12];

            const shoulderWidthPx = Math.abs(rightShoulder.x - leftShoulder.x) * this.video!.videoWidth;
            // Approximate shoulder width ~0.4m for adult
            const approxDepth = (0.4 * this.focalLength) / shoulderWidthPx;

            const cx = this.principalPoint[0];
            const cy = this.principalPoint[1];
            depth = approxDepth;
            position[0] = ((nose.x * this.video!.videoWidth - cx) * depth) / this.focalLength;
            // Negate Y: camera space (Y down) -> Three.js world space (Y up)
            position[1] = -((nose.y * this.video!.videoHeight - cy) * depth) / this.focalLength;
            position[2] = depth;
            source = 'pose';
        }

        return { position, orientation, depth, source };
    }
}