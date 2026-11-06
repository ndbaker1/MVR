# Task 6: Wave Calibration Routine

## Summary
Implement a wave calibration routine that simultaneously calibrates: (1) clock offset between webcam and phone, (2) lever arm length and orientation, (3) initial yaw alignment.

## Deliverables
1. Calibration UI overlay in web app
2. Clock offset measurement: ping-pong between webcam client and phone client via server
3. Lever arm calibration: user waves racket in known pattern; filter estimates offset from hand to racket
4. Yaw initialization: swing excitation + hand orientation landmarks provide absolute yaw reference
5. Calibration state persistence (localStorage)

## Technical Details
- Clock offset: Server timestamps + client round-trip times → estimate offset
- Lever arm: User holds racket, does figure-8 motion. Hand position from webcam, racket position from phone IMU. Difference → lever arm.
- Yaw: Gyro alone has no absolute yaw. Swings excite yaw; hand orientation from landmarks provides world-frame reference. Combine to initialize yaw.
- Duration: ~5-10 seconds of waving

## Dependencies
- WebRTC or WebSocket timing for clock sync
- Hand landmarks from webcam
- IMU data from phone
- Filter with lever arm states

## Integration
- UI: "Calibrate" button starts wave routine
- Server: Coordinates timing, runs calibration filter
- Client: Both webcam and phone must be connected
- Result: Calibration parameters stored and used in tracking