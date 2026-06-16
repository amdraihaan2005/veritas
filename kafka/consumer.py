import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from kafka import KafkaConsumer
import json
import pandas as pd

from backend.fraud_detection_service import predict_transaction
from database.database import SessionLocal
from database.models import Transaction

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092"
)

consumer = KafkaConsumer(
    "transactions",
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    auto_offset_reset="latest",
    value_deserializer=lambda x: json.loads(x.decode("utf-8"))
)

session = SessionLocal()

print("Listening for transactions...", flush=True)

for message in consumer:
    transaction = message.value

    transaction_df = pd.DataFrame([transaction])
    transaction_df = transaction_df.drop(columns=["Class"])

    prediction, risk_score = predict_transaction(transaction_df)

    db_transaction = Transaction(
        Time=transaction["Time"],
        V1=transaction["V1"],
        V2=transaction["V2"],
        V3=transaction["V3"],
        V4=transaction["V4"],
        V5=transaction["V5"],
        V6=transaction["V6"],
        V7=transaction["V7"],
        V8=transaction["V8"],
        V9=transaction["V9"],
        V10=transaction["V10"],
        V11=transaction["V11"],
        V12=transaction["V12"],
        V13=transaction["V13"],
        V14=transaction["V14"],
        V15=transaction["V15"],
        V16=transaction["V16"],
        V17=transaction["V17"],
        V18=transaction["V18"],
        V19=transaction["V19"],
        V20=transaction["V20"],
        V21=transaction["V21"],
        V22=transaction["V22"],
        V23=transaction["V23"],
        V24=transaction["V24"],
        V25=transaction["V25"],
        V26=transaction["V26"],
        V27=transaction["V27"],
        V28=transaction["V28"],
        Amount=transaction["Amount"],
        prediction=prediction,
        risk_score=risk_score
    )

    session.add(db_transaction)
    session.commit()

    print(
        f"Transaction stored successfully "
        f"(Prediction={prediction}, Risk Score={risk_score:.2f})",
        flush=True
    )