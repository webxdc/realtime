import {
  createEncoder,
  toUint8Array,
  writeVarString,
  writeVarUint,
  writeVarUint8Array,
  writeAny,
} from "lib0/encoding";
import {
  createDecoder,
  readVarString,
  readVarUint,
  readVarUint8Array,
  readAny,
} from "lib0/decoding";

const CHUNK_SIZE = 126000;

const MessageTypes = {
  Presence: 0,
  Payload: 1,
};

const PeerStatus = {
  Offline: 0,
  Online: 1,
};

type Serializable =
  | string
  | number
  | bigint
  | boolean
  | any[]
  | Uint8Array<ArrayBufferLike>
  | { [x: string]: any }
  | null
  | undefined;

export interface Peer<State> {
  id: string;
  lastSeen: number;
  state: State;
}

export class RealTime<
  State extends Serializable,
  Payload extends Serializable,
> {
  private peers: Record<string, Peer<State>> = {};
  private channel: any;
  private packetId = 0;
  private packets: Record<string, Record<number, Record<number, Uint8Array>>> =
    {};
  private timeout: number;
  private tick: number;
  private onPeersChanged: (peers: Record<string, Peer<State>>) => void;
  private onPayload: (deviceId: string, payload: Payload) => void;
  private interval: number = 0;
  private deviceId: string;
  private status: number = PeerStatus.Offline;
  private state: State | null;

  constructor({
    state,
    presenceTimeout,
    presenceInterval,
    onPeersChanged,
    onPayload,
  }: {
    state?: State | null;
    presenceTimeout?: number;
    presenceInterval?: number;
    onPeersChanged: (peers: Peer<State>[]) => void;
    onPayload: (deviceId: string, payload: Payload) => void;
  }) {
    this.onPeersChanged = (peers) => onPeersChanged(toArray(peers));
    this.onPayload = onPayload;
    this.state = state || null;
    this.timeout = presenceTimeout === undefined ? 5 : presenceTimeout;
    this.tick = presenceInterval === undefined ? 2 : presenceInterval;
    this.deviceId = getDeviceId();
  }

  connect() {
    this.status = PeerStatus.Online;
    this.channel = window.webxdc.joinRealtimeChannel();
    this.channel.setListener((data: Uint8Array) => {
      const decoder = createDecoder(data);
      const deviceId = readVarString(decoder);
      const packetId = readVarUint(decoder);
      const index = readVarUint(decoder);
      const total = readVarUint(decoder);
      const buffer = readVarUint8Array(decoder);
      if (total === 1) {
        this.handlePacket(buffer);
      } else {
        if (!this.packets[deviceId]) this.packets[deviceId] = {};
        const packets = this.packets[deviceId];

        if (!packets[packetId]) packets[packetId] = {};
        const chunks = packets[packetId];

        chunks[index] = buffer;
        if (Object.keys(chunks).length === total) {
          delete packets[packetId];
          const arrays = Object.keys(chunks)
            .map(Number)
            .sort((a, b) => a - b)
            .map((key) => chunks[key]);
          this.handlePacket(concatUint8Arrays(arrays));
        }
      }
    });
    this.interval = window.setInterval(() => this.sync(), this.tick * 1000);
  }

  disconnect() {
    if (this.status === PeerStatus.Online) {
      clearInterval(this.interval);
      this.status = PeerStatus.Offline;
      this.sendPresence();
    }
  }

  setState(state: State) {
    this.state = state;
  }

  getState(): State | null {
    return this.state;
  }

  getPeers(): Peer<State>[] {
    return toArray(this.peers);
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  sendPayload(payload: Payload) {
    const encoder = createEncoder();
    writeVarUint(encoder, MessageTypes.Payload);
    writeVarString(encoder, this.deviceId);
    writeAny(encoder, payload);
    this.sendToChannel(toUint8Array(encoder));
  }

  private handlePacket(data: Uint8Array) {
    const decoder = createDecoder(data);
    const mType = readVarUint(decoder);
    const deviceId = readVarString(decoder);
    if (mType === MessageTypes.Presence) {
      const status = readVarUint(decoder);
      if (status === PeerStatus.Online) {
        const state = readAny(decoder);
        this.peers[deviceId] = {
          id: deviceId,
          lastSeen: new Date().valueOf(),
          state,
        };
      } else {
        delete this.peers[deviceId];
        delete this.packets[deviceId];
      }
      this.onPeersChanged(this.peers);
    } else if (mType === MessageTypes.Payload) {
      this.onPayload(deviceId, readAny(decoder));
    } else {
      console.error("Unexpected MessageType: " + mType);
    }
  }
  private sendToChannel(data: Uint8Array) {
    const packetId = ++this.packetId;
    const total = Math.ceil(data.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.length);

      const encoder = createEncoder();
      writeVarString(encoder, this.deviceId);
      writeVarUint(encoder, packetId);
      writeVarUint(encoder, i);
      writeVarUint(encoder, total);
      writeVarUint8Array(encoder, data.subarray(start, end));
      this.channel.send(toUint8Array(encoder));
    }
  }

  private sendPresence() {
    const status = this.status;
    const encoder = createEncoder();
    writeVarUint(encoder, MessageTypes.Presence);
    writeVarString(encoder, this.deviceId);
    writeVarUint(encoder, status);
    if (status !== PeerStatus.Offline) {
      writeAny(encoder, this.state);
    }
    this.sendToChannel(toUint8Array(encoder));
  }

  private sync() {
    this.sendPresence();

    let peersChanged = false;
    Object.keys(this.peers).forEach((key) => {
      const now = new Date().valueOf();
      if (now - this.peers[key].lastSeen > this.timeout * 1000) {
        delete this.peers[key];
        peersChanged = true;
      }
    });
    if (peersChanged) {
      this.onPeersChanged(this.peers);
    }
  }
}

function toArray<E>(obj: Record<string, E>): E[] {
  return Object.values(obj).map((element: E) => element);
}

function getDeviceId(): string {
  const key = "__realtime__.deviceId";
  let deviceId = localStorage[key];
  if (deviceId) return deviceId;

  try {
    deviceId = crypto.randomUUID();
  } catch (ex) {
    const s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    deviceId =
      s4() +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      s4() +
      s4();
  }
  localStorage[key] = deviceId;
  return deviceId;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  // Calculate the total length of the new Uint8Array
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);

  // Create a new Uint8Array with the total length
  const result = new Uint8Array(totalLength);

  // Set each Uint8Array into the result
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length; // Update the offset
  }

  return result;
}
