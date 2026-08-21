from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    # Atlas needs the CA bundle, and passing tlsCAFile is enough to turn TLS on
    # — which is why it cannot be passed unconditionally: a local mongod has no
    # TLS listener, so the handshake fails before the first query.
    tls = {"tlsCAFile": certifi.where()} if MONGODB_URL.startswith("mongodb+srv://") else {}
    client = AsyncIOMotorClient(MONGODB_URL, **tls)
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


def get_chat_messages_collection():
    """One document per message. Kept as separate docs rather than an array on
    a session so a long conversation is an append, not a growing document."""
    return get_database()["chat_messages"]


def get_chat_sessions_collection():
    """Per-session search filters, so they survive a reload without being
    re-derived from the transcript on every turn."""
    return get_database()["chat_sessions"]
