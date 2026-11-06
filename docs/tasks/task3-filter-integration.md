# Task 3: Vision as Delayed Position Update with Gating and Replay

## Summary
Integrate webcam vision measurements into the error-state Kalman filter as delayed position updates with anisotropic noise, Mahalanobis gating, and latency replay.

## Deliverables
1. Ring buffer of IMU states and IMU samples for latency replay
2. Vision position update with anisotropic noise (tight laterally, loose along camera ray)
3. Mahalanobis distance gating to reject bad detections
4. Timestamp handling: map webcam device clock and phone clock into server time via ping-offset
5. State rollback/replay when delayed vision measurement arrives
6. requestVideoFrameCallback capture timestamp verification

## Technical Details
- Ring buffer: Keep states and IMU samples for ~100-200 ms
- When vision measurement stamped T ms ago arrives: roll back state to T, apply update, re-propagate buffered IMU
- Anisotropic noise: diagonal covariance with small values laterally (x,y), large along camera ray (z)
- Gating: Mahalanobis distance > threshold → reject measurement
- Clock sync: ping-offset approach to map client clocks to server time

## Dependencies
- NALgebra for matrix math
- WebSocket ping/pong for clock offset measurement
- Client-side timestamp capture from requestVideoFrameCallback

## Integration
- Server: Filter.get_state(timestamp) for rollback, filter.replay_imu() for re-propagation
- Client: Vision measurements include capture timestamp
- Protocol: Extended message types for vision position + timestamp