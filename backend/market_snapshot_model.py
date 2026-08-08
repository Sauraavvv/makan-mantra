from typing import List, Optional

from pydantic import BaseModel, Field


class PriceTrendQuarterlyModel(BaseModel):
    q1_previous_year: Optional[str] = None
    q2_previous_year: Optional[str] = None
    q3_previous_year: Optional[str] = None
    q4_previous_year: Optional[str] = None
    q1_current_year: Optional[str] = None
    q2_current_year: Optional[str] = None
    note: Optional[str] = None


class PriceBandModel(BaseModel):
    min_price_inr: Optional[float] = None
    max_price_inr: Optional[float] = None
    example_localities: List[str] = []


class BuilderFloorPriceModel(BaseModel):
    min_price_crore_inr: Optional[float] = None
    max_price_crore_inr: Optional[float] = None
    note: Optional[str] = None


class CityWideMetricsModel(BaseModel):
    average_per_sq_meter_inr: Optional[float] = None
    average_per_sq_ft_inr: Optional[float] = None


class AskingPriceModel(BaseModel):
    affordable_pockets: Optional[PriceBandModel] = None
    mid_segment_locales: Optional[PriceBandModel] = None
    premium_locales: Optional[PriceBandModel] = None
    independent_builder_floors_or_villas: Optional[BuilderFloorPriceModel] = None
    city_wide_metrics: Optional[CityWideMetricsModel] = None


class BhkRentModel(BaseModel):
    bhk_type: str
    min_rent_inr: Optional[float] = None
    max_rent_inr: Optional[float] = None


class RentSegmentModel(BaseModel):
    segment: str
    example_localities: List[str] = []
    bhk_configurations: List[BhkRentModel] = []


class DeveloperModel(BaseModel):
    developer_name: str
    total_experience_years: Optional[int] = None
    total_projects: Optional[int] = None
    range_of_projects_offered: Optional[str] = None


class ProjectModel(BaseModel):
    project_name: str
    location: Optional[str] = None
    min_price_crore_inr: Optional[float] = None
    max_price_crore_inr: Optional[float] = None


class MarketSnapshotResponse(BaseModel):
    id: str = Field(..., alias="_id")
    document_type: str = "market_snapshot"
    slug: str
    route_slug: str
    state_name: str
    # The leading market the figures describe, e.g. "Gurugram (Haryana)".
    city: str
    data_currency: str = "INR"
    market_status_as_of: Optional[str] = None
    price_trend_growth_quarterly: PriceTrendQuarterlyModel = PriceTrendQuarterlyModel()
    asking_price_per_sq_ft: AskingPriceModel = AskingPriceModel()
    monthly_average_rent_by_bhk: List[RentSegmentModel] = []
    top_developers: List[DeveloperModel] = []
    top_projects: List[ProjectModel] = []
    is_active: bool = True
    content_version: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        populate_by_name = True
