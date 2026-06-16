from pathlib import Path

import joblib
import pandas as pd
from prometheus_client import Counter

BASE_DIR = Path(__file__).resolve().parent.parent

model = joblib.load(BASE_DIR / "model" / "fraud_model.pkl")
scaler = joblib.load(BASE_DIR / "model" / "scaler.pkl")

print("Artifacts loaded successfully.", flush=True)

fraud_predictions_total = Counter(
    "fraud_predictions_total",
    "Total number of fraudulent transactions detected"
)

df = pd.read_csv(BASE_DIR / "data" / "creditcard.csv")

X = df.drop("Class", axis=1)
X_scaled = scaler.transform(X)

all_scores = model.decision_function(X_scaled)

score_max = all_scores.max()
score_min = all_scores.min()


def predict_transaction(transaction):
    scaled_transaction = scaler.transform(transaction)

    prediction = model.predict(scaled_transaction)

    anomaly_score = model.decision_function(scaled_transaction)[0]

    risk_score = (
        (score_max - anomaly_score)
        / (score_max - score_min)
    ) * 100

    fraud_prediction = 1 if prediction[0] == -1 else 0

    if fraud_prediction == 1:
        fraud_predictions_total.inc()

    return fraud_prediction, float(risk_score)