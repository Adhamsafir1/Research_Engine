import os
import requests

from bs4 import BeautifulSoup
from tavily import TavilyClient
from langchain.tools import tool
from dotenv import load_dotenv

# ==========================
# Load Environment Variables
# ==========================

load_dotenv()

TAVILY_API_KEY = os.getenv(
    "TAVILY_API_KEY"
)

if not TAVILY_API_KEY:

    raise ValueError(
        "TAVILY_API_KEY "
        "not found in "
        "environment variables."
    )

tavily = TavilyClient(
    api_key=TAVILY_API_KEY
)

# (Removed strict TRUSTED_DOMAINS list to allow diverse deep research sources)


# ==========================
# Web Search Tool
# ==========================

@tool
def web_Search(
    query: str
) -> list:

    """
    Search the web for
    recent, reliable,
    evidence-backed
    information.

    Returns structured
    search results.
    """

    try:

        results = tavily.search(

            query=query,
            max_results=10,
            include_answer=True,
            include_raw_content=False
        )

        search_results = []

        for r in results.get(
            "results",
            []
        ):

            url = r.get(
                "url",
                ""
            )

            title = r.get(
                "title",
                "No Title"
            )

            content = r.get(
                "content",
                "No Content"
            )

            score = r.get(
                "score",
                0
            )

            published_date = (
                r.get(
                    "published_date",
                    "Unknown"
                )
            )

            search_results.append({

                "title":
                title,

                "url":
                url,

                "content":
                content[:500],

                "score":
                score,

                "published_date":
                published_date
            })

        if not search_results:

            return []

        return search_results

    except Exception as e:

        print(
            f"Search failed:"
            f" {str(e)}"
        )

        return []


# ==========================
# Scraper Tool
# ==========================

@tool
def scrape_url(
    url: str
) -> str:

    """
    Scrape and return
    clean webpage content
    for deeper research.
    """

    try:

        headers = {

            "User-Agent":

            "Mozilla/5.0 "
            "(Macintosh; "
            "Intel Mac OS X "
            "10_15_7)"
        }

        response = requests.get(

            url,

            timeout=15,

            headers=headers
        )

        response.raise_for_status()

        soup = BeautifulSoup(

            response.text,

            "html.parser"
        )

        # remove noisy HTML

        noisy_tags = [

            "script",
            "style",
            "nav",
            "footer",
            "header",
            "aside",
            "iframe",
            "noscript",
            "svg",
            "form",
            "button",
            "ads"
        ]

        for tag in soup(
            noisy_tags
        ):

            tag.decompose()

        content = soup.get_text(

            separator=" ",

            strip=True
        )

        # whitespace cleanup

        content = " ".join(
            content.split()
        )

        if len(content) < 150:

            return (
                "Insufficient "
                "meaningful content "
                "scraped from URL."
            )

        # token-safe limit

        return content[:8000]

    except requests.exceptions.Timeout:

        return (
            "Scraping failed: "
            "Request timeout."
        )

    except (
        requests
        .exceptions
        .ConnectionError
    ):

        return (
            "Scraping failed: "
            "Connection error."
        )

    except (
        requests
        .exceptions
        .HTTPError
    ) as e:

        return (

            "Scraping failed: "
            f"HTTP error - "
            f"{str(e)}"
        )

    except Exception as e:

        return (
            "Could not scrape URL: "
            f"{str(e)}"
        )


# ==========================
# Local Testing
# ==========================

if __name__ == "__main__":

    print(
        "\n===== SEARCH "
        "TEST =====\n"
    )

    results = (
        web_Search.invoke(

            "Latest breakthroughs "
            "in quantum computing"
        )
    )

    for item in results:

        print("\n")

        print(
            "TITLE:",
            item["title"]
        )

        print(
            "URL:",
            item["url"]
        )

        print(
            "SCORE:",
            item["score"]
        )

    print(
        "\n===== SCRAPE "
        "TEST =====\n"
    )

    print(

        scrape_url.invoke(

            "https://www.reuters.com/"
        )[:1000]
    )