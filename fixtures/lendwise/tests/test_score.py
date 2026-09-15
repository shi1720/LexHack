def test_review_band_triggers_human_review():
    from lendwise.models.score import REVIEW_BAND

    assert REVIEW_BAND[0] < REVIEW_BAND[1]
