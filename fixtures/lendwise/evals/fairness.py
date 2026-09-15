"""Fairness evaluation run on every model release."""

import pandas as pd
from fairlearn.metrics import MetricFrame, demographic_parity_difference, selection_rate

PROTECTED_ATTRIBUTES = ["gender", "ethnicity", "age_band"]


def selection_rate_by_group(df: pd.DataFrame, attribute: str) -> pd.Series:
    frame = MetricFrame(
        metrics=selection_rate,
        y_true=df["actual_default"],
        y_pred=df["decision"] == "approve",
        sensitive_features=df[attribute],
    )
    return frame.by_group


def impact_ratio(rates: pd.Series) -> pd.Series:
    """Impact ratio = selection rate for a group / selection rate of the most selected group."""
    return rates / rates.max()


def disparate_impact_report(df: pd.DataFrame) -> dict:
    report = {}
    for attribute in PROTECTED_ATTRIBUTES:
        rates = selection_rate_by_group(df, attribute)
        report[attribute] = {
            "selection_rates": rates.to_dict(),
            "impact_ratio": impact_ratio(rates).to_dict(),
            "demographic_parity_difference": demographic_parity_difference(
                df["actual_default"], df["decision"] == "approve", sensitive_features=df[attribute]
            ),
        }
    return report
