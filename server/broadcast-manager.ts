// Global broadcast manager for WebSocket events
let broadcastBetFunction: ((bet: any) => void) | null = null;
let broadcastAllFunction: ((data: any) => void) | null = null;

export function setBroadcastBetFunction(fn: (bet: any) => void) {
  broadcastBetFunction = fn;
}

export function setBroadcastAllFunction(fn: (data: any) => void) {
  broadcastAllFunction = fn;
}

export function broadcastNewBet(bet: any) {
  if (broadcastBetFunction) {
    broadcastBetFunction(bet);
  }
}

export function broadcastToAll(data: any) {
  if (broadcastAllFunction) {
    broadcastAllFunction(data);
  }
}