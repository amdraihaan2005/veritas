import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/fraud_detection"
)

frontend_origins_raw = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175"
)

FRONTEND_ORIGINS = [
    origin.strip() 
    for origin in frontend_origins_raw.split(",") 
    if origin.strip()
]

extended_origins = []
for origin in FRONTEND_ORIGINS:
    extended_origins.append(origin)
    if "localhost" in origin:
        extended_origins.append(origin.replace("localhost", "127.0.0.1"))
FRONTEND_ORIGINS = list(set(extended_origins))

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
