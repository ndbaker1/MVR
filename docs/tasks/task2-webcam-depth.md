# Task 2: Webcam Depth Estimation with MediaPipe

## Summary
Add a static webcam client that uses MediaPipe to extract 2D landmarks and estimate metric 3D positions. The webcam handles head and body tracking while the phone stays as the IMU racket.

## Deliverables
1. Web client with MediaPipe integration (head pose + hand + body)
2. Pinhole depth estimation from interocular distance for head
3. PnP solve for hand/body metric world landmarks
4. Camera intrinsics calibration (focal length from FOV)
5. Per-user scale calibration (stand at measured distance once)
6. Debug overlay showing landmarks and depth
7. Verification against tape measure at 1.0, 1.5, 2.0 m

## Technical Details
- Head depth: pinhole relation on interocular distance. At 720p with ~60° HFOV, f ≈ 1100 px, so at 1.5 m eyes are ~46 px apart. One pixel error ≈ 3 cm depth.
- Hand/body: Fit MediaPipe's metric world landmarks to 2D image landmarks with PnP solve. Model's own geometry provides scale reference.
- Per-user scale: User stands at measured distance once to fix IPD scale.
- Camera intrinsics: Must be calibrated for PnP.

## Dependencies
- MediaPipe.js (or @mediapipe/hand_landmarker + @mediapipe/pose)
- Three.js for rendering
- WebRTC or canvas capture for webcam feed
- Pinhole camera model utilities

## Integration
- Client: New webcam client component
- Server: Extended IMU measurement protocol to include vision measurements
- Filter: Vision measurements feed into EKF as delayed position updates