
from fastapi import APIRouter

router = APIRouter(prefix="/certificates", tags=["certificates"])

@router.get("/attempt/{attempt_id}")
def get_certificate(attempt_id: int):
    return {"message": f"Certificate feature coming soon for attempt {attempt_id}"}