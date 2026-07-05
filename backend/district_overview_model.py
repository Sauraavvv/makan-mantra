from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DistrictCoordinatesModel(BaseModel):
    latitude: float
    longitude: float


class DistrictLocationModel(BaseModel):
    coordinates: Optional[DistrictCoordinatesModel] = None


class DistrictOverviewResponse(BaseModel):
    id: Optional[str] = None
    district_name: str
    state_name: str
    slug: str
    country: str = "India"
    location: Optional[DistrictLocationModel] = None
    overview: Dict[str, Any] = {}
    connectivity: Dict[str, Any] = {}
    real_estate_overview: Dict[str, Any] = {}
    social_infrastructure: Dict[str, Any] = {}
    economy_employment: Dict[str, Any] = {}
    lifestyle_environment: Dict[str, Any] = {}
    investment_angle: Dict[str, Any] = {}
    faq: List[Dict[str, Any]] = []
    sources: Dict[str, Any] = {}
