# Realtime

[![npm package](https://img.shields.io/npm/v/@webxdc/realtime.svg)](https://npmjs.com/package/@webxdc/realtime)
[![CI](https://github.com/webxdc/realtime/actions/workflows/ci.yml/badge.svg)](https://github.com/webxdc/realtime/actions/workflows/ci.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

High level real-time and presence API on top of [webxdc.joinRealtimeChannel()](https://webxdc.org/docs/spec/joinRealtimeChannel.html).

With this library you can easily discover online peers
and send big payloads without having to worry about the 128KB
size limit of the `webxdc.joinRealtimeChannel()` API.

## Install

```
npm install @webxdc/realtime
```

## Usage

Quick overview of the API:

```js
import { RealTime } from "@webxdc/realtime";

const realtime = new RealTime({
  onPeersChanged: (peers) => console.log(peers),
  onPayload: (peerId, payload) => console.log(peerId, payload),
});

// optional: set a state to be advertised to peers
realtime.setState({ status: "I am available!" });

// go online
realtime.connect();

// payload can be any object you want
realtime.sendPayload({ name: "foo", text: "hi!" });
```

For a full example check the [./src/main.ts](https://github.com/webxdc/realtime/blob/main/src/main.ts) file.
