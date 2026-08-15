from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mongodb import close_db, connect_db, get_news_views_collection
from routers import district_overview, gone, location_pages, market_snapshot, news, state_overview


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await get_news_views_collection().create_index([("article_slug", 1), ("visitor_hash", 1)], unique=True)
    yield
    await close_db()


app = FastAPI(title="Makan Mantraa API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gone.router)
app.include_router(location_pages.router)
app.include_router(state_overview.router)
app.include_router(district_overview.router)
app.include_router(market_snapshot.router)
app.include_router(news.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "Makan Mantraa API"}
