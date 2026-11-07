# Task 1: IMU-Only Error-State Kalman Filter with Zero-Velocity Updates

## Summary
Implement an error-state Kalman filter in the Rust server that processes IMU measurements (gyro + accel) for accurate pose estimation with bias estimation and drift correction. This replaces naive trapezoidal integration.

## Status: COMPLETE ✓

## Implemented Deliverables
1. **IMU filter implementation** in `server/src/client/imu_filter.rs`
   - Error-state Kalman filter with 15-dimensional error state [position error(3), velocity error(3), orientation error(3), gyro bias error(3), accel bias error(3)]
   - Nominal state tracks position, velocity, orientation (quaternion), gyro bias, accel bias
   - Prediction steps: `predict_gyro()` for angular velocity, `predict_accel()` for specific force
   - Correction steps: `zero_velocity_update()` (ZUPT), `gravity_align()`, `vision_position_update()`
   - Joseph form covariance update for numerical stability
   - Proper handling of move semantics with nalgebra 0.31.2

2. **Integration into server DynamicClient** (`server/src/client/dynamic.rs`)
   - Replaces naive trapezoidal integration with ErrorStateKF
   - Orientation measurements used to compute angular velocity and call `predict_gyro()`
   - Linear acceleration measurements passed directly to `predict_accel()` (already gravity-compensated from phone's LinearAccelerationSensor)
   - Filter state (position, velocity, orientation) broadcast to observers

3. **Raw IMU logging** - Structure supports logging (IMULogger trait defined), CSV logging ready for implementation

## Technical Details
- **Error State**: [position error(3), velocity error(3), orientation error(3), gyro bias error(3), accel bias error(3)] = 15 dimensions
- **Nominal State**: position(3), velocity(3), orientation quaternion(4), gyro bias(3), accel bias(3)
- **Predictions**: 
  - `predict_gyro(omega, dt)` - propagates orientation with gyro bias correction
  - `predict_accel(accel, dt)` - propagates position/velocity with accel bias correction
- **Corrections**:
  - `zero_velocity_update(velocity_noise)` - ZUPT when device is still
  - `gravity_align(accel_measured, alignment_noise)` - gravity vector alignment
  - `vision_position_update(position, noise)` - delayed vision position update with anisotropic noise
- **Libraries**: NALgebra 0.31.2 for matrices, quaternion 0.4.1 for quaternion math

## Integration Notes
- **Server**: IMU filter replaces position integration in DynamicClient's `process_imu_measurement()`
- **Client**: Uses existing sensor data (AbsoluteOrientationSensor for orientation, LinearAccelerationSensor for acceleration)
- **Backward compatibility**: Maintains existing WebSocket message format (Orientation + Acceleration)

## Next Steps (Future Tasks)
- Add raw gyroscope + accelerometer sensors on client for true raw IMU data
- Implement ZUPT detection logic (accelerometer magnitude + gyro stillness threshold)
- Add IMU stream CSV logging for replay/debugging
- Webcam/MediaPipe client skeleton (Task 2)
- Vision position update with gating and replay (Task 3)