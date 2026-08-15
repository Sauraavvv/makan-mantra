from typing import List, Optional

from pydantic import BaseModel, Field


class NewsAuthorModel(BaseModel):
    name: str = ""
    avatarUrl: str = ""


class NewsFeaturedImageModel(BaseModel):
    url: str
    altText: str
    publicId: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    bytes: Optional[int] = None


class NewsSeoModel(BaseModel):
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None


class NewsResponse(BaseModel):
    id: str = Field(..., alias="_id")
    document_type: str = "news"
    title: str
    slug: str
    summary: str
    content: str
    category: str
    tags: List[str] = Field(default_factory=list)
    author: NewsAuthorModel = Field(default_factory=NewsAuthorModel)
    featuredImage: NewsFeaturedImageModel
    publishedAt: str
    updatedAt: str
    status: str = "draft"
    seo: NewsSeoModel = Field(default_factory=NewsSeoModel)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        populate_by_name = True


class NewsCommentCreateRequest(BaseModel):
    author_name: str = Field(default="Reader", min_length=1, max_length=80)
    body: str = Field(..., min_length=1, max_length=2000)


class NewsCommentResponse(BaseModel):
    id: str
    article_slug: str
    author_name: str
    body: str
    created_at: str
    editable_until: Optional[str] = None
    updated_at: Optional[str] = None


class NewsCommentCreateResponse(NewsCommentResponse):
    owner_token: str
    comment_count: int


class NewsCommentUpdateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class NewsCommentDeleteResponse(BaseModel):
    deleted: bool
    comment_count: int


class NewsCommentCountResponse(BaseModel):
    count: int


class NewsViewCountResponse(BaseModel):
    count: int
