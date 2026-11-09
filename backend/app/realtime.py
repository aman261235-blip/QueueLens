
from fastapi import WebSocket
from typing import Dict, Set


class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections by location ID
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, location_id: int):
        await websocket.accept()

        if location_id not in self.active_connections:
            self.active_connections[location_id] = set()

        self.active_connections[location_id].add(websocket)

    def disconnect(self, websocket: WebSocket, location_id: int):
        if location_id in self.active_connections:
            self.active_connections[location_id].discard(websocket)

            if not self.active_connections[location_id]:
                del self.active_connections[location_id]

    async def broadcast(self, location_id: int, message: dict):
        connections = self.active_connections.get(location_id, set())

        disconnected = []

        for connection in list(connections):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection, location_id)


manager = ConnectionManager()
