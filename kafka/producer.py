from transaction_generator import generate_transactions
from kafka import KafkaProducer
import json
import os

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092"
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda x: json.dumps(x).encode("utf-8")
)

for transaction in generate_transactions():
    producer.send(
        "transactions",
        transaction
    )
    producer.flush()
    print("Transaction sent", flush=True)