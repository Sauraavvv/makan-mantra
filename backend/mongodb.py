from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGODB_URL)
    print("MongoDB connected")

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB disconnected")

def get_database():
    return client["makan_mantraa"]

def get_state_pages_collection():
    return get_database()["state_pages"]

def get_state_overview_collection():
    return get_database()["state_overview"]
