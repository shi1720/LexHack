"""Feature construction for the probability-of-default model."""

import pandas as pd

FEATURE_COLUMNS = [
    "annual_income",
    "debt_to_income",
    "employment_months",
    "bureau_score",
    "num_delinquencies",
    "loan_amount",
    "postcode_prefix",
]


def build_features(application) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "annual_income": application.annual_income,
                "debt_to_income": application.dti_ratio,
                "employment_months": application.employment_months,
                "bureau_score": application.bureau_score,
                "num_delinquencies": application.delinquencies,
                "loan_amount": application.loan_amount,
                "postcode_prefix": application.postcode[:3],
            }
        ]
    )[FEATURE_COLUMNS]
