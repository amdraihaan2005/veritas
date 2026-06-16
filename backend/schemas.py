from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TransactionResponse(BaseModel):
    id: int
    transaction_timestamp: datetime
    Time: float
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float
    Amount: float
    prediction: int
    risk_score: float

    model_config = ConfigDict(from_attributes=True)

class StatsResponse(BaseModel):
    total_transactions: int
    total_frauds: int
    fraud_rate: float
    average_risk_score: float
