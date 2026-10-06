import { authorizeDocument } from './access.service.js';

// "Who else has this document open" without websockets or extra infrastructure: clients send a heartbeat
// every few seconds and the server remembers who was seen recently. State is in memory, so it is
// approximate by design: it resets on restart and is per API instance (a multi-instance deployment
// would move this to a shared store such as Redis, which this project deliberately does not add).
export const PRESENCE_TTL_MS = 25_000;
const SWEEP_EVERY_MS = 60_000;

const rooms = new Map(); // documentId -> Map(userId -> { name, lastSeen })
let lastSweep = 0;

function sweep(now) {
  for (const [documentId, room] of rooms) {
    for (const [userId, p] of room) if (now - p.lastSeen > PRESENCE_TTL_MS) room.delete(userId);
    if (room.size === 0) rooms.delete(documentId);
  }
  lastSweep = now;
}

const active = (room, now) =>
  [...room].filter(([, p]) => now - p.lastSeen <= PRESENCE_TTL_MS).map(([id, p]) => ({ id, name: p.name }));

// Records the caller as present and returns everyone seen recently (including the caller).
export async function heartbeat(user, documentId) {
  const { doc } = await authorizeDocument(documentId, user, 'read'); // only people with access are listed
  const now = Date.now();
  if (now - lastSweep > SWEEP_EVERY_MS) sweep(now);
  const room = rooms.get(doc.id) ?? new Map();
  rooms.set(doc.id, room);
  room.set(user.id, { name: user.name, lastSeen: now });
  return active(room, now);
}

// Called when a user closes the editor, so the avatar disappears immediately instead of after the TTL.
export async function leave(user, documentId) {
  const { doc } = await authorizeDocument(documentId, user, 'read');
  const room = rooms.get(doc.id);
  if (room) {
    room.delete(user.id);
    if (room.size === 0) rooms.delete(doc.id);
  }
}
