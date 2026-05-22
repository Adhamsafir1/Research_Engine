from AAgents import (
    write_chain,
    critic_chain,
    query_planner_chain
)

import logging
import time

from tools import web_Search, scrape_url

# ==========================
# Logging Config
# ==========================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)


# ==========================
# Main Pipeline (with SSE streaming support)
# ==========================

def run_research_pipeline(topic: str, on_event=None) -> dict:
    """
    Deep Research Pipeline with real-time event streaming.

    Flow:
        Query Planner → Deep Search → Multi-URL Scrape → Writer → Critic

    Args:
        topic: The research topic string.
        on_event: Optional callback fn(event_type: str, data: dict)
                  called at each pipeline step for SSE streaming.
    """

    def emit(event_type, data):
        """Emit a streaming event to the frontend."""
        if on_event:
            on_event(event_type, data)
        logger.info(f"[EVENT] {event_type}: {str(data)[:200]}")

    # ==========================
    # Input Validation
    # ==========================

    if not topic.strip():
        raise ValueError("Research topic cannot be empty.")

    state = {
        "topic": topic,
        "query_plan": {},
        "search_result": "",
        "scrape_result": "",
        "report": "",
        "feedback": "",
        "logs": [],
        "metadata": {}
    }

    try:
        pipeline_start = time.time()
        logger.info(f"Pipeline Started | Topic={topic}")

        # =====================================
        # STEP 1 — QUERY PLANNER
        # =====================================

        print("\n" + "=" * 60)
        print("STEP 1: QUERY PLANNER")
        print("=" * 60)

        emit("planning", {"message": "Analyzing topic and planning research strategy..."})

        planner_start = time.time()

        planner_result = query_planner_chain.invoke({"query": topic})

        planner_time = round(time.time() - planner_start, 2)

        state["query_plan"] = planner_result

        subqueries = planner_result.get("subqueries", [])
        if not subqueries:
            subqueries = [topic]

        # Ensure we have at least 4 subqueries for deep research
        if len(subqueries) < 4:
            subqueries.append(f"{topic} latest news and developments")
        if len(subqueries) < 4:
            subqueries.append(f"{topic} expert analysis and opinions")
        if len(subqueries) < 4:
            subqueries.append(f"{topic} challenges and future outlook")

        state["logs"].append({
            "agent": "Query Planner",
            "status": "success",
            "execution_time": planner_time,
            "intent": planner_result.get("intent"),
            "complexity": planner_result.get("complexity"),
            "subqueries": subqueries
        })

        emit("plan_ready", {
            "subqueries": subqueries,
            "complexity": planner_result.get("complexity", "medium"),
            "intent": planner_result.get("intent", "factual")
        })

        print(f"\nGenerated {len(subqueries)} subqueries:")
        for i, sq in enumerate(subqueries, 1):
            print(f"  [{i}] {sq}")

        # =====================================
        # STEP 2 — DEEP SEARCH (Direct Tool Call)
        # =====================================

        print("\n" + "=" * 60)
        print("STEP 2: DEEP SEARCH")
        print("=" * 60)

        search_start = time.time()

        all_search_results = []
        all_urls = []  # list of (url, score, title) tuples

        # Low-value domains that yield little scrapable content
        SKIP_DOMAINS = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com']

        total_subqueries = min(len(subqueries), 6)

        for idx, subquery in enumerate(subqueries[:6], 1):

            print(f"\n[SEARCH {idx}/{total_subqueries}] Querying: {subquery}")
            logger.info(f"Searching: {subquery}")

            emit("searching", {
                "query": subquery,
                "index": idx,
                "total": total_subqueries
            })

            try:
                results = web_Search.invoke(subquery)

                if isinstance(results, list):
                    for item in results:
                        title = item.get("title", "No Title")
                        url = item.get("url", "")
                        content = item.get("content", "No Content")
                        score = item.get("score", 0)
                        published = item.get("published_date", "Unknown")

                        formatted = (
                            f"Title: {title}\n"
                            f"URL: {url}\n"
                            f"Score: {score}\n"
                            f"Published: {published}\n"
                            f"Content: {content}\n"
                        )
                        all_search_results.append(formatted)

                        seen_urls = [u[0] for u in all_urls]
                        is_skip_domain = any(d in url for d in SKIP_DOMAINS)
                        if url and url not in seen_urls and not is_skip_domain:
                            all_urls.append((url, score, title))

                            # Emit each source to frontend
                            emit("source", {
                                "title": title,
                                "url": url,
                                "score": score
                            })

                        print(f"  [FOUND] {title} | {url} | score={score}")

                elif isinstance(results, str) and results.strip():
                    all_search_results.append(results)
                    print(f"  [TEXT] {results[:150]}")

            except Exception as e:
                print(f"  [ERROR] Search failed for '{subquery}': {e}")
                logger.error(f"Search failed for '{subquery}': {e}")

        state["search_result"] = "\n\n---\n\n".join(all_search_results)

        # Sort URLs by relevance score (highest first) for smart scraping
        all_urls.sort(key=lambda x: x[1], reverse=True)
        unique_urls = [u[0] for u in all_urls]

        search_time = round(time.time() - search_start, 2)

        state["logs"].append({
            "agent": "Deep Search",
            "status": "success",
            "execution_time": search_time,
            "subqueries_run": subqueries[:6],
            "urls_found": len(unique_urls),
        })

        print(f"\n[SEARCH] Completed in {search_time}s")
        print(f"[SEARCH] Found {len(unique_urls)} unique URLs")

        if not state["search_result"]:
            raise Exception("Search returned empty response.")

        # =====================================
        # STEP 3 — DEEP SCRAPE (Direct Tool Call)
        # =====================================

        print("\n" + "=" * 60)
        print("STEP 3: DEEP SCRAPE")
        print("=" * 60)

        scrape_start = time.time()

        scraped_texts = []
        scrape_success = 0
        max_scrapes = min(len(unique_urls), 20)

        for idx, url in enumerate(unique_urls[:20], 1):
            print(f"\n[SCRAPE {idx}/{max_scrapes}] Fetching: {url}")

            emit("scraping", {
                "url": url,
                "index": idx,
                "total": max_scrapes
            })

            try:
                content = scrape_url.invoke({"url": url})
                if content and "failed" not in content.lower()[:50]:
                    scraped_texts.append(
                        f"--- SOURCE: {url} ---\n{content}\n"
                    )
                    scrape_success += 1

                    emit("scraped", {
                        "url": url,
                        "chars": len(content),
                        "status": "ok"
                    })

                    print(f"  [OK] Scraped {len(content)} chars")
                else:
                    print(f"  [SKIP] Low quality: {str(content)[:80]}")
            except Exception as e:
                print(f"  [ERROR] {url}: {e}")

        if not scraped_texts:
            scraped_texts.append("No additional deeper content could be scraped.")

        state["scrape_result"] = "\n\n".join(scraped_texts)

        scrape_time = round(time.time() - scrape_start, 2)

        state["logs"].append({
            "agent": "Deep Scrape",
            "status": "success",
            "execution_time": scrape_time,
            "urls_attempted": max_scrapes,
            "urls_scraped": scrape_success,
        })

        print(f"\n[SCRAPE] Completed in {scrape_time}s | {scrape_success}/{max_scrapes} URLs")

        # =====================================
        # STEP 4 — WRITER AGENT
        # =====================================

        print("\n" + "=" * 60)
        print("STEP 4: WRITER AGENT")
        print("=" * 60)

        emit("writing", {"message": "Synthesizing deep research report..."})

        writer_start = time.time()

        research_combined = f"""
SEARCH RESULTS ({len(all_search_results)} sources found):
{state["search_result"]}

DETAILED SCRAPED CONTENT ({scrape_success} pages analyzed):
{state["scrape_result"]}
"""

        state["report"] = write_chain.invoke({
            "topic": topic,
            "research": research_combined
        })

        writer_time = round(time.time() - writer_start, 2)

        state["logs"].append({
            "agent": "Writer Agent",
            "status": "success",
            "execution_time": writer_time,
        })

        emit("report", {"content": state["report"]})

        print(f"\n[WRITER] Report generated in {writer_time}s")

        # =====================================
        # STEP 5 — CRITIC AGENT
        # =====================================

        print("\n" + "=" * 60)
        print("STEP 5: CRITIC AGENT")
        print("=" * 60)

        emit("critiquing", {"message": "Evaluating report quality and accuracy..."})

        critic_start = time.time()

        state["feedback"] = critic_chain.invoke({
            "report": state["report"]
        })

        critic_time = round(time.time() - critic_start, 2)

        state["logs"].append({
            "agent": "Critic Agent",
            "status": "success",
            "execution_time": critic_time,
        })

        emit("feedback", {"content": state["feedback"]})

        print(f"\n[CRITIC] Evaluation completed in {critic_time}s")

        # =====================================
        # Metadata & Completion
        # =====================================

        total_time = round(time.time() - pipeline_start, 2)

        state["metadata"] = {
            "topic": topic,
            "pipeline_status": "success",
            "total_execution_time": total_time,
            "total_sources": len(unique_urls),
            "total_scraped": scrape_success
        }

        emit("done", {
            "total_time": total_time,
            "total_sources": len(unique_urls),
            "total_scraped": scrape_success
        })

        logger.info(f"Pipeline Finished | Time={total_time}s | Sources={len(unique_urls)} | Scraped={scrape_success}")

        return state

    except Exception as e:

        logger.error(f"Pipeline Failed: {str(e)}")

        emit("error", {"message": str(e)})

        return {
            "status": "failed",
            "error": str(e),
            "report": "Research generation failed.",
            "feedback": "No feedback generated.",
            "logs": state.get("logs", []),
            "query_plan": state.get("query_plan", {}),
            "metadata": {"pipeline_status": "failed"}
        }


# ==========================
# Local Testing
# ==========================

if __name__ == "__main__":

    topic = input("\nEnter Research Topic: ")

    def print_event(event_type, data):
        print(f"  >> SSE: {event_type} = {data}")

    result = run_research_pipeline(topic, on_event=print_event)

    print("\n" + "=" * 60)
    print("FINAL REPORT")
    print("=" * 60)
    print(result.get("report", "No report"))

    print("\n" + "=" * 60)
    print("CRITIC FEEDBACK")
    print("=" * 60)
    print(result.get("feedback", "No feedback"))