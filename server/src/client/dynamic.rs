use std::{
    collections::VecDeque,
    net::TcpStream,
    sync::{Arc, Mutex},
};

use image::{ImageBuffer, Rgba};
use once_cell::sync::Lazy;
use serde::Deserialize;
use slamr::slam::tracker::{SizedFeature, Tracker};
use tungstenite::{Message, WebSocket};

use crate::{Pose, ServerState};

pub type Quaternion = [f64; 4];
pub type Vec3 = [f64; 3];

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "data")]
enum IMUMeasurement {
    Orientation(Quaternion),
    Acceleration(Vec3),
}

pub enum FrameType {
    Viewer,
    Racket,
}

/// A Client which reports state changes and stores motion data
pub struct DynamicClient {
    /// Shared referece to the position data that gets broacasted out to every observer client
    position_data: Arc<Mutex<ServerState>>,
    /// Local copy of 3D postition of object
    position: Vec3,
    /// Orientation of the camera
    orientation: Quaternion,
    /// 3D velocity of the object
    velocity: Vec3,
    /// 3D acceleration of the object
    acceleration: Vec3,
    /// Indicator of which component the client wants to send or receive data for
    component: FrameType,
    /// Represents the id of the connected client
    user: usize,
    /// Config for data from the client's stream.
    /// only applicable if the client is opting into odometry
    stream_config: (u32, u32),
}

impl DynamicClient {
    pub fn new(user: usize, position_data: Arc<Mutex<ServerState>>, component: FrameType) -> Self {
        Self {
            user,
            component,
            position_data,
            position: [0.0, 0.0, 0.0],
            orientation: [0.0, 0.0, 0.0, 0.0],
            velocity: [0.0, 0.0, 0.0],
            acceleration: [0.0, 0.0, 0.0],
            stream_config: (150, 150),
        }
    }

    pub fn handle(mut self, mut websocket_stream: WebSocket<TcpStream>) {
        // continue processing requests from the connection
        while let Ok(message) = websocket_stream.read_message() {
            match message {
                // using text messages for json payloads and data structures
                Message::Text(text) => match serde_json::from_str::<IMUMeasurement>(&text) {
                    Ok(client_data) => self.process_imu_measurement(client_data, super::DELTA),
                    Err(e) => log::error!("[{}]", e),
                },
                // using binary messages for video stream frame data
                Message::Binary(data) => {
                    match ImageBuffer::<Rgba<u8>, &[u8]>::from_raw(
                         self.stream_config.0,
                         self.stream_config.1,
                         &data,
                     ) {
                         Some(frame) => self.process_image_buffer(frame),
                         None => log::error!(
                             "failed to parse bytes as [`ImageBuffer::<Rgba<u8>, &mut [u8]>`]. Message is {} bytes long.", data.len()
                         ),
                     }
                }
                Message::Close(frame) => log::info!("connection closing [{:?}]", frame),
                Message::Ping(ping) => log::info!("ping [{:?}]", ping),
                Message::Pong(pong) => log::info!("pong [{:?}]", pong),
                _ => log::warn!("unused message [{:?}]", message),
            }
        }

        log::info!("cleaning up data for client [{}].", self.user);
        self.cleanup_client();
        log::info!("racket client [{}] disconnected.", self.user);
    }

    /// Compute updates to positional and motion data from the IMU measurements takes from the client device.
    /// This could be acclerometers, gyroscopes, magnometers, etc...
    fn process_imu_measurement(&mut self, imu_measurement: IMUMeasurement, delta: f64) {
        match imu_measurement {
            IMUMeasurement::Acceleration(acceleration_measurement) => {
                let acceleration_update = preproccess_acceleration(
                    acceleration_measurement,
                    &self.orientation,
                    &self.component,
                );

                let velocity_update = [
                    self.velocity[0]
                        + (self.acceleration[0] + acceleration_update[0]) * 0.5 * delta,
                    self.velocity[1]
                        + (self.acceleration[1] + acceleration_update[1]) * 0.5 * delta,
                    self.velocity[2]
                        + (self.acceleration[2] + acceleration_update[2]) * 0.5 * delta,
                ];

                self.position[0] += (self.velocity[0] + velocity_update[0]) * 0.5 * delta;
                self.position[1] += (self.velocity[1] + velocity_update[1]) * 0.5 * delta;
                self.position[2] += (self.velocity[2] + velocity_update[2]) * 0.5 * delta;

                // update current references
                self.velocity = velocity_update;
                self.acceleration = acceleration_update;
            }
            IMUMeasurement::Orientation(orientation_measurement) => {
                self.orientation = preprocess_orientation(orientation_measurement, &self.component);
            }
        }

        self.update_server_state();
    }

    // Load the raw bytes into an RBGA image buffer to use for Visual Odometry
    fn process_image_buffer(&mut self, image_buffer: ImageBuffer<Rgba<u8>, &[u8]>) {
        // run monocular slam on image buffer
        let features = Tracker::extract_features(&image_buffer);
    }

    /// Lock ServerState pose data and update our own entry with most recent parameters
    fn update_server_state(&self) {
        if let Ok(mut data) = self.position_data.lock() {
            data.insert(
                self.user,
                Pose {
                    position: self.position,
                    orientation: self.orientation,
                },
            );
        }
    }

    /// Remove and data that persists for a client when they are connected to the session
    fn cleanup_client(&mut self) {
        // remove the user data once they disconnect
        self.position_data.lock().unwrap().remove(&self.user);
    }
}

/// Preprocess rotations based on orientation of phone
fn preprocess_orientation(orientation: Quaternion, component: &FrameType) -> Quaternion {
    let [rx, ry, rz, w] = orientation;
    match component {
        FrameType::Racket => {
            // Racket Control
            // invert and reverse the X and Y rotation:
            //      1. flip y and z based on how we interpret them
            //      2. flip sign of everything but W for inverse = conjugate
            //      3. mirror the XY plane (negation of the Z and W values).
            [-rx, -rz, ry, -w]
        }
        FrameType::Viewer => {
            /// This quaternion orients a phone such that the viewing perspecting
            /// is based upon the orientation of the camera and is meant to be handled horizontally.
            static BASE_CAMERA_QUATERNION: Lazy<quaternion::Quaternion<f64>> = Lazy::new(|| {
                quaternion::mul(
                    // offset the phone so that looking down is not looking straight
                    quaternion::axis_angle([0.0, 1.0, 0.0], 1.68),
                    // the phone needs to be rotated in order to use it sideways
                    quaternion::axis_angle([1.0, 0.0, 0.0], -1.68),
                )
            });

            // Head Control
            let (w, [x, y, z]) = quaternion::mul((w, [rx, ry, rz]), *BASE_CAMERA_QUATERNION);

            [-y, z, -x, w]
        }
    }
}

/// Process accelerometer measurements to accomodate phone rotation
fn preproccess_acceleration(
    acceleration: Vec3,
    orientation: &Quaternion,
    component: &FrameType,
) -> Vec3 {
    let [ax, ay, az] = acceleration;
    let [rx, ry, rz, w] = *orientation;
    quaternion::rotate_vector(
        (w, [rx, ry, rz]),
        match component {
            // see rotation logic, then apply the negated transformation since we have no valid negative 'w' component
            // undos: *rotation = [-x, -z, y, -w];
            FrameType::Racket => [ax, az, -ay],
            FrameType::Viewer => [ax, ay, az],
        },
    )
}

type PositionSnapshot = (Vec<SizedFeature>, Vec3);

#[derive(Default)]
struct VisualStabilizer {
    capture_window: VecDeque<PositionSnapshot>,
}

impl VisualStabilizer {
    const WINDOW_SIZE: usize = 50;
    const MIN_CORRESPONDENCE: usize = 20;
    const MAX_DISTANCE_ERROR: u32 = 200;

    fn append_frame(&mut self, snapshot: PositionSnapshot) {
        if snapshot.0.len() >= 40 {
            self.capture_window.push_back(snapshot);

            if self.capture_window.len() > Self::WINDOW_SIZE {
                self.capture_window.pop_front();
            }
        }
    }

    fn detect_match(&self, features: &Vec<SizedFeature>) -> Option<&Vec3> {
        self.capture_window
            .iter()
            .filter_map(|(old_features, pos)| {
                let matches = Tracker::match_features_knn(features, old_features);

                if let Some((_, inlier_indexes)) = Tracker::sample_consensus_fundamental(&matches) {
                    let matches = inlier_indexes.iter().map(|&k| matches[k]);

                    if matches.len() < Self::MIN_CORRESPONDENCE {
                        return None;
                    }

                    let dist = matches.fold(0, |acc, cur| {
                        acc + (cur.0.keypoint.x - cur.1.keypoint.x).pow(2)
                            + (cur.0.keypoint.y - cur.1.keypoint.y).pow(2)
                    });

                    if dist > Self::MAX_DISTANCE_ERROR {
                        return None;
                    }

                    return Some((dist, pos));
                }

                None
            })
            .max_by_key(|(dist, _)| *dist)
            .map(|(_, pos)| pos)
    }
}
