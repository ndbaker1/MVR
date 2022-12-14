use client::dynamic::{Quaternion, Vec3};
use serde::Serialize;
use std::{
    collections::HashMap,
    env,
    net::TcpListener,
    sync::{Arc, Mutex},
    thread,
};

use tungstenite::{accept_hdr, handshake::server::Request};

use crate::client::{
    dynamic::{DynamicClient, FrameType},
    observer::ObserverClientManager,
};

mod client;

fn main() {
    env_logger::init();
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| String::from("42069"))
        .parse()
        .expect("PORT must be a number");
    Server::serve(&format!("0.0.0.0:{}", port));
}

/// Container for the positions and orientation of an object in a scene
#[derive(Debug, Default, Serialize)]
pub struct Pose {
    /// 3D coordinate of the object
    position: Vec3,
    /// Rotation of the object measured in quaternions
    orientation: Quaternion,
}

type ServerState = HashMap<usize, Pose>;

const RACKET_PATH: &str = "racket";
const HEAD_PATH: &str = "head";
const OBSERVER_PATH: &str = "observer";

struct Server;

impl Server {
    fn serve(listener_addr: &str) {
        let listener = TcpListener::bind(listener_addr).unwrap();

        let data = Arc::new(Mutex::new(ServerState::default()));

        log::info!("creating handler for observers...");
        let observers = Arc::new(Mutex::new(Vec::new()));

        let observers_clone = observers.clone();
        let data_clone = data.clone();
        thread::spawn(move || ObserverClientManager::run(data_clone, observers_clone));

        log::info!("listening for connections on [{}].", listener_addr);
        loop {
            match listener.accept() {
                Ok((tcp, _addr)) => {
                    // Waits for new connections asynchronously
                    // when a client attempts to connect, read the URI to get extra metadata
                    let mut request_uri = None;
                    if let Ok(websocket_stream) = accept_hdr(tcp, |request: &Request, response| {
                        log::info!("incoming client request with URI [{}].", request.uri());
                        request_uri = Some(request.uri().clone().to_string());
                        Ok(response)
                    }) {
                        let url_string = request_uri.unwrap_or_default();
                        let url = url_string.trim_start_matches('/');
                        match url.split('/').collect::<Vec<_>>().get(1).unwrap().parse() {
                            Ok(user) => {
                                if url.starts_with(RACKET_PATH) {
                                    let data = data.clone();
                                    thread::spawn(move || {
                                        log::info!("spawning racket client with id [{}].", user);
                                        DynamicClient::new(user, data, FrameType::Racket)
                                            .handle(websocket_stream)
                                    });
                                } else if url.starts_with(HEAD_PATH) {
                                    let data = data.clone();
                                    thread::spawn(move || {
                                        log::info!("spawning head client with id [{}].", user);
                                        DynamicClient::new(user, data, FrameType::Viewer)
                                            .handle(websocket_stream);
                                    });
                                } else if url.starts_with(OBSERVER_PATH) {
                                    // observer websockets will be added to a Vec that way each does client doesn't try to acquire a lock to the data mutex.
                                    // the master client handler will lock data once and send it through all of the websockets.
                                    observers
                                        .lock()
                                        .expect("add new observer websocket.")
                                        .push((user, websocket_stream));
                                } else {
                                    log::error!(
                                        "incomming connection did not provide valid type in url."
                                    );
                                }
                            }
                            Err(e) => log::error!("{}", e),
                        }
                    }
                }
                Err(e) => {
                    log::error!("what happened [{}]", e);
                }
            };
        }
    }
}
