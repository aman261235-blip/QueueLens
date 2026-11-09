
from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    people_waiting: int = Field(default=0, ge=0)


class QueueUpdate(BaseModel):
    people_waiting: int = Field(ge=0)
