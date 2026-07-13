from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class CoordinatesModel(BaseModel):
    latitude: float = 0.0
    longitude: float = 0.0


class LocationModel(BaseModel):
    country: str = "India"
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    town: Optional[str] = None
    locality: Optional[str] = None
    sub_locality: Optional[str] = None
    village: Optional[str] = None
    coordinates: Optional[CoordinatesModel] = None


class SeoModel(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    on_page_title: Optional[str] = None
    on_page_description: Optional[str] = None
    tags: List[str] = []
    keywords: List[str] = []
    faq_schema: Optional[Dict[str, Any]] = None


class StateModel(BaseModel):
    id: str = Field(..., alias="_id")
    slug: str
    location_category: str
    location_name: str
    property_type: str
    listing_type: str
    location: LocationModel
    seo: SeoModel

    class Config:
        populate_by_name = True

    @classmethod
    def from_mongo(cls, doc: dict) -> "StateModel":
        if doc is None:
            return None
        doc["_id"] = doc.get("_id", doc.get("id", ""))
        return cls(**doc)


class StateModelResponse(BaseModel):
    id: str
    slug: str
    location_category: str
    location_name: str
    property_type: str
    listing_type: str
    location: LocationModel
    seo: SeoModel
