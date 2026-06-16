from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge

from database.database import SessionLocal
from database.models import Transaction
from backend.schemas import TransactionResponse, StatsResponse
from config.settings import FRONTEND_ORIGINS

app = FastAPI()
Instrumentator().instrument(app).expose(app)

fraud_count_gauge = Gauge(
    "fraud_transactions_total",
    "Total number of fraudulent transactions"
)

total_transactions_gauge = Gauge(
    "transactions_total",
    "Total number of processed transactions"
)

average_risk_score_gauge = Gauge(
    "average_risk_score",
    "Average risk score of all transactions"
)

high_risk_transactions_gauge = Gauge(
    "high_risk_transactions_total",
    "Number of transactions with risk score above 80"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get(
    "/",
    tags=["Health"],
    summary="Health check",
    description="Verify that the Fraud Detection API is running."
)
def root():
    return {
        "message": "Fraud Detection API is running"
    }


@app.get(
    "/transactions",
    response_model=list[TransactionResponse],
    tags=["Transactions"],
    summary="Latest transactions",
    description="Return the latest 100 processed transactions ordered by descending ID."
)
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).all()
    return transactions


@app.get(
    "/frauds",
    response_model=list[TransactionResponse],
    tags=["Fraud Detection"],
    summary="Latest fraud transactions",
    description="Return the latest 100 transactions predicted as fraud."
)
def get_frauds(db: Session = Depends(get_db)):
    frauds = (
        db.query(Transaction)
        .filter(Transaction.prediction == 1)
        .order_by(Transaction.id.desc())
        .limit(100)
        .all()
    )
    return frauds


@app.get(
    "/high-risk",
    response_model=list[TransactionResponse],
    tags=["Risk Analysis"],
    summary="Highest risk transactions",
    description="Return transactions with the highest risk scores."
)
def get_high_risk_transactions(db: Session = Depends(get_db)):
    high_risk_transactions = (
        db.query(Transaction)
        .order_by(Transaction.risk_score.desc())
        .limit(100)
        .all()
    )
    return high_risk_transactions


@app.get(
    "/stats",
    response_model=StatsResponse,
    tags=["Statistics"],
    summary="System statistics",
    description="Return aggregate statistics including transaction count, fraud count, fraud rate, and average risk score."
)
def get_stats(db: Session = Depends(get_db)):
    total_transactions = db.query(Transaction).count()
    total_transactions_gauge.set(total_transactions)

    total_frauds = (
        db.query(Transaction)
        .filter(Transaction.prediction == 1)
        .count()
    )

    high_risk_transactions = (
    db.query(Transaction)
    .filter(Transaction.risk_score >= 80)
    .count()
    )

    high_risk_transactions_gauge.set(high_risk_transactions)

    fraud_count_gauge.set(total_frauds)

    risk_scores = db.query(Transaction.risk_score).all()

    average_risk_score = (
        sum(score[0] for score in risk_scores) / total_transactions
        if total_transactions > 0
        else 0
    )
    average_risk_score_gauge.set(average_risk_score)

    fraud_rate = (
        total_frauds / total_transactions * 100
        if total_transactions > 0
        else 0
    )

    return {
        "total_transactions": total_transactions,
        "total_frauds": total_frauds,
        "fraud_rate": fraud_rate,
        "average_risk_score": average_risk_score
    }