"""Accuracy benchmark against the frozen validation set."""

from sklearn.metrics import roc_auc_score, precision_score, recall_score

GROUND_TRUTH = "data/validation_2026Q1.parquet"
AUC_THRESHOLD = 0.78


def evaluate(model, df):
    preds = model.predict(df)
    return {
        "roc_auc": roc_auc_score(df["actual_default"], preds),
        "precision": precision_score(df["actual_default"], preds > 0.5),
        "recall": recall_score(df["actual_default"], preds > 0.5),
    }
