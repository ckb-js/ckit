#!/bin/bash

function start_ckb_docker {
    docker run -itd -p 8114:8114 tockb/ckb-dev:v0.39.2
}

function start_mercury {
    ./target/release/mercury -c devtools/config/testnet_config.toml run 
}
