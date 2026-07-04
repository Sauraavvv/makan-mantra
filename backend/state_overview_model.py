from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OverviewCoordinatesModel(BaseModel):
    latitude: float
    longitude: float


class OverviewLocationModel(BaseModel):
    country: str = "India"
    state: str
    state_type: str
    coordinates: Optional[OverviewCoordinatesModel] = None


class OverviewSeoModel(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    page_title: Optional[str] = None
    page_description: Optional[str] = None


class StateOverviewModel(BaseModel):
    id: str = Field(..., alias="_id")
    document_type: str = "state_overview"
    slug: str
    route_slug: str
    route_path: str
    state_name: str
    state_type: str
    country: str = "India"
    location: OverviewLocationModel
    seo: OverviewSeoModel
    overview: Dict[str, Any]
    connectivity: Dict[str, Any]
    social_infrastructure: Dict[str, Any]
    lifestyle_environment: Dict[str, Any]
    investment_angle: Dict[str, Any]
    faq: List[Dict[str, Any]] = []
    sources: Dict[str, Any] = {}
    is_active: bool = True
    content_version: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        populate_by_name = True

    @classmethod
    def from_mongo(cls, doc: dict) -> "StateOverviewModel":
        if doc is None:
            return None
        doc["_id"] = doc.get("_id", doc.get("id", ""))
        return cls(**doc)


class StateOverviewResponse(StateOverviewModel):
    pass
