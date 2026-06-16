import pandas as pd
import time

df = pd.read_csv("../data/creditcard.csv")

transactions = df.to_dict(orient="records")


def generate_transactions():
    for transaction in transactions:
        time.sleep(1)
        yield transaction