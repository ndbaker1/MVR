# Task 4: Dual Hand Measurement Sources with Different Noise Models

## Summary
Use two measurement sources for hand tracking: hand landmarker and pose model’s wrist, each with different noise characteristics. Combine them in the Kalman filter to improve robustness.

## Deliverables
1. Hand landmarker (MediaPipe hand tracking) - typically steady during fast motion
2. Pose model wrist landmark - more robust when hand is wrapped around grip
3. Separate noise covariances for each measurement source
4. Measurement fusion in filter (weighted combination based on noise)

## Technical Details
- Hand landmarker: Good during swing, less reliable during grip closure
- Pose wrist: Often steadier during fast motion and grip, may drift
- Feed both into vision position update with different noise values
- Filter can choose best measurement based on current dynamics

## Dependencies
- MediaPipe hand and pose processors
- Common benchmark noise values for each landmarker

## Integration
- Client: Extract both hand landmarker and pose wrist positions
- Server: Vision measurement includes source identifier and position
- Filter: Weighted combination based on source reliability