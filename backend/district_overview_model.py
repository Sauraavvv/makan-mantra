from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DistrictCoordinatesModel(BaseModel):
    latitude: float
    longitude: float


class DistrictLocationModel(BaseModel):
    coordinates: Optional[DistrictCoordinatesModel] = None


class DistrictSeoModel(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    page_title: Optional[str] = None
    page_description: Optional[str] = None


class DistrictOverviewResponse(BaseModel):
    id: Optional[str] = None
    document_type: str = "district_overview"
    district_name: str
    state_name: str
    slug: str
    route_slug: Optional[str] = None
    route_path: Optional[str] = None
    district_type: Optional[str] = None
    country: str = "India"
    location: Optional[DistrictLocationModel] = None
    seo: DistrictSeoModel = DistrictSeoModel()
    overview: Dict[str, Any] = {}
    connectivity: Dict[str, Any] = {}
    real_estate_overview: Dict[str, Any] = {}
    social_infrastructure: Dict[str, Any] = {}
    economy_employment: Dict[str, Any] = {}
    lifestyle_environment: Dict[str, Any] = {}
    investment_angle: Dict[str, Any] = {}
    faq: List[Dict[str, Any]] = []
    sources: Dict[str, Any] = {}
