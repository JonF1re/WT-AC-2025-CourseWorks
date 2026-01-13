from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import json
import csv
import io

from database import get_db
from auth import get_current_user, get_current_admin_user
import schemas

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/results")
def export_results(
    format: str = Query("json", regex="^(json|csv|excel)$"),
    quiz_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Экспорт результатов в различных форматах"""
    
   
    if user_id and user_id != current_user.id and current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    data = [
        {
            "attempt_id": 1,
            "quiz_title": "Основы Python",
            "user": current_user.username,
            "started_at": datetime.now().isoformat(),
            "finished_at": datetime.now().isoformat(),
            "time_spent": 330,
            "total_points": 8,
            "max_points": 10,
            "score_percentage": 80.0,
            "is_completed": True
        }
    ]
    
    if format == "json":
        return JSONResponse(content=data)
    
    elif format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return StreamingResponse(
            io.StringIO(output.getvalue()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    
    elif format == "excel":
        # Для Excel нужна дополнительная библиотека
        raise HTTPException(status_code=501, detail="Excel export coming soon")