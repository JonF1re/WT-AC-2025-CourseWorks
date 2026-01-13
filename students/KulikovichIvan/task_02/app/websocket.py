from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict, channel: str):
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/quiz/{quiz_id}")
async def websocket_quiz_progress(websocket: WebSocket, quiz_id: int):
    """WebSocket для отслеживания прогресса в квизе"""
    channel = f"quiz_{quiz_id}"
    await manager.connect(websocket, channel)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "progress_update":
                await manager.broadcast({
                    "type": "progress_update",
                    "user_id": message.get("user_id"),
                    "quiz_id": quiz_id,
                    "progress": message.get("progress"),
                    "timestamp": datetime.now().isoformat()
                }, channel)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

@router.websocket("/ws/user/{user_id}")
async def websocket_user_notifications(websocket: WebSocket, user_id: int):
    """WebSocket для уведомлений пользователя"""
    channel = f"user_{user_id}"
    await manager.connect(websocket, channel)
    
    try:
        while True:
          
            await websocket.receive_text()  
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

@router.websocket("/ws/admin")
async def websocket_admin_dashboard(websocket: WebSocket):
    """WebSocket для админ-панели в реальном времени"""
    await manager.connect(websocket, "admin")
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "request_stats":
                stats = {
                    "type": "stats_update",
                    "online_users": len(manager.active_connections.get("user_*", [])),
                    "active_quizzes": len([c for c in manager.active_connections.keys() if c.startswith("quiz_")]),
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_personal_message(stats, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "admin")