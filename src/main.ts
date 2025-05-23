import { RealTime, Peer } from "../lib/realtime";

interface State {
  name: string;
}

const onlineCounter = document.getElementById("onlineCounter")!;
const chatArea = document.getElementById("chatArea")!;
const draftArea = document.getElementById("draftArea")! as HTMLInputElement;
const sendBtn = document.getElementById("sendBtn")!;

const addMessage = (name: string, text: string) => {
  const msg = document.createElement("div");
  msg.setAttribute("padding", "0.5em");
  const label = document.createElement("strong");
  label.append(name + ": ");
  msg.append(label, text);
  chatArea.append(msg);
};

const state = { name: window.webxdc.selfName };
let peers: Peer<State>[] = [];

const onPeersChanged = (newPeers: Peer<State>[]) => {
  peers = newPeers;
  onlineCounter.innerText = `${peers.length + 1}`;
};

const onPayload = (peerId: string, payload: string) => {
  const peer = peers.find((p) => p.id === peerId)?.state.name || peerId;
  addMessage(peer, payload);
};

const realtime = new RealTime({
  state,
  onPeersChanged,
  onPayload,
});

realtime.connect();
window.addEventListener("beforeunload", () => realtime.disconnect());

sendBtn.onclick = () => {
  const msg = draftArea.value;
  draftArea.value = "";
  realtime.sendPayload(msg);
  addMessage(state.name, msg);
};
