from urllib.parse import urlparse


# ==========================
# Trust Scores
# ==========================

TRUST_SCORES = {

    "nature.com": 10,
    "gov": 10,

    "ieee.org": 9,
    "mit.edu": 9,
    "reuters.com": 9,

    "bbc.com": 8,
    "arxiv.org": 8,

    "forbes.com": 7,

    "sciencedirect.com": 9
}


# ==========================
# Source Ranking
# ==========================

def rank_sources(
    results: list
) -> list:

    """
    Rank retrieved sources
    using authority +
    retrieval relevance.
    """

    ranked = []

    for r in results:

        url = r.get(
            "url",
            ""
        )

        retrieval_score = (
            r.get(
                "score",
                0
            )
        )

        authority_score = 0

        for domain, score in (
            TRUST_SCORES.items()
        ):

            if domain in url:

                authority_score = (
                    score
                )

                break

        # weighted score

        final_score = (

            authority_score
            * 0.6

            +

            retrieval_score
            * 0.4
        )

        r["authority_score"] = (
            authority_score
        )

        r["final_score"] = round(

            final_score,

            2
        )

        ranked.append(r)

    ranked.sort(

        key=lambda x:
        x["final_score"],

        reverse=True
    )

    return ranked


# ==========================
# Local Testing
# ==========================

if __name__ == "__main__":

    test_data = [

        {
            "url":
            "https://reuters.com",

            "score":
            0.91
        },

        {
            "url":
            "https://randomblog.com",

            "score":
            0.95
        },

        {
            "url":
            "https://nature.com",

            "score":
            0.82
        }
    ]

    ranked = (
        rank_sources(
            test_data
        )
    )

    print(
        "\n===== RANKED "
        "RESULTS =====\n"
    )

    for item in ranked:

        print(item)