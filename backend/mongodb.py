from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    print("MongoDB connected")

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB disconnected")

def get_database():
    return client["makan_mantraa"]

def get_location_pages_collection():
    return get_database()["location_pages"]

def get_state_overview_collection():
    return get_database()["state_overview"]

def get_district_overview_collection():
    return get_database()["district_overview"]

def get_market_snapshot_collection():
    return get_database()["market_snapshot"]


def get_news_collection():
    return get_database()["news"]


def get_news_comments_collection():
    return get_database()["news_comments"]


def get_news_views_collection():
    return get_database()["news_views"]
