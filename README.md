# Realtime

[![npm package](https://img.shields.io/npm/v/@webxdc/realtime.svg)](https://npmjs.com/package/@webxdc/realtime)
[![CI](https://github.com/webxdc/realtime/actions/workflows/ci.yml/badge.svg)](https://github.com/webxdc/realtime/actions/workflows/ci.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

High level real-time and presence API on top of [webxdc.joinRealtimeChannel()](https://webxdc.org/docs/spec/joinRealtimeChannel.html).

## Why to use?

🟢 easily discover who is online, no need to implement presence on your own.

🔄 easy sync/advertising of user's state with peers.

💫 send and receive objects around similar to the
`webxdc.sendUpdate()` API without having to worry to convert from/to `Uint8Array`

📦 send big payloads of MBs without worrying to split in chunks
of 128KB

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

Remember to include the `webxdc.js` file in your `index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="webxdc.js"></script>
  </head>
  <body>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

For a full example check the [./src/main.ts](https://github.com/webxdc/realtime/blob/main/src/main.ts) file.
