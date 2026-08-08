from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mongodb import connect_db, close_db
from routers import district_overview, gone, location_pages, market_snapshot, state_overview


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="Makan Mantraa API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gone.router)
app.include_router(location_pages.router)
app.include_router(state_overview.router)
app.include_router(district_overview.router)
app.include_router(market_snapshot.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "Makan Mantraa API"}
