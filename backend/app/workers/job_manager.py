import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("sani_forensic.jobs")

class JobConnectionManager:
    """Manages active WebSocket connections for real-time forensic job monitoring."""
    def __init__(self):
        # Maps job_id -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Global connection set for broadcast events (e.g. system dashboard alerts)
        self.global_subscribers: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, job_id: Optional[str] = None):
        await websocket.accept()
        if job_id:
            if job_id not in self.active_connections:
                self.active_connections[job_id] = set()
            self.active_connections[job_id].add(websocket)
        else:
            self.global_subscribers.add(websocket)

    def disconnect(self, websocket: WebSocket, job_id: Optional[str] = None):
        if job_id and job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        else:
            self.global_subscribers.discard(websocket)

    async def broadcast_job_progress(self, job_id: str, data: Dict[str, Any]):
        """Send job progress update to all clients listening to a specific job."""
        if job_id in self.active_connections:
            message = json.dumps(data)
            dead_sockets = []
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.active_connections[job_id].discard(dead)

    async def broadcast_system_alert(self, data: Dict[str, Any]):
        """Send system alert to all global subscribers."""
        message = json.dumps(data)
        dead_sockets = []
        for connection in self.global_subscribers:
            try:
                await connection.send_text(message)
            except Exception:
                dead_sockets.append(connection)
        for dead in dead_sockets:
            self.global_subscribers.discard(dead)

job_manager = JobConnectionManager()
