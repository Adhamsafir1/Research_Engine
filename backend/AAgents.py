from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder
)
from langchain_core.output_parsers import (
    StrOutputParser, 
    JsonOutputParser 
)
from backend.tools import ( 
    web_Search, 
    scrape_url 
)
import os
import warnings 
warnings.filterwarnings("ignore")
from dotenv import load_dotenv
load_dotenv()


MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

if not MISTRAL_API_KEY:
    raise ValueError(
        "MISTRAL_API_KEY not found in environment variables."
    )

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=MISTRAL_API_KEY,
    temperature=0.4,
    max_tokens=16000,
    timeout=180,
    max_retries=3,
)


# ==========================
# QUERY PLANNER
# ==========================

planner_prompt = (
    ChatPromptTemplate
    .from_messages([

    (
        "system",

        """
        You are an expert research planner.

        Your task is to analyze
        a research query and
        convert it into a
        structured research plan.

        Return ONLY valid JSON.

        Do NOT explain anything.
        Do NOT wrap in markdown.
        Do NOT add ```json.
        Do NOT add text before or after JSON.

        The output MUST be
        strictly parseable JSON.

        JSON format:

        {{
          "main_query": "",
          "intent": "",
          "complexity": "",
          "subqueries": [],
          "entities": [],
          "source_types": [],
          "retrieval_strategy": "",
          "reasoning_type": "",
          "priority_order": [],
          "search_depth": ""
        }}

        Rules:

        1. Break broad queries
        into 4–6 focused,
        high-value searchable
        subqueries.

        Avoid redundant
        or overlapping
        subqueries.

        2. Extract entities.

        3. Infer intent.

        Allowed intents:
        - factual
        - comparison
        - market_research
        - technical
        - news

        Allowed source types:
        - news
        - academic
        - government
        - technical_docs
        - market_reports

        Allowed strategies:
        - simple
        - multi-hop
        - temporal
        - comparative

        Search depth:
        - low
        - medium
        - high

        Subquery Rules:
        - ALWAYS generate 5-6 subqueries
        - Prioritize diversity of angles
        - Avoid overlap
        - Focus on evidence-rich searches
        - Cover: definitions, latest news, expert analysis, data/statistics, challenges, and future outlook

        For simple factual queries:
        Generate 4-5 subqueries from different angles.

        For complex research topics:
        Generate exactly 6 diverse,
        high-value subqueries.

        Return JSON only.

        Example:

        Query:
        Future of Nvidia AI chips

        Output:

        {{
        "main_query":
        "Future of Nvidia AI chips",

        "intent":
        "market_research",

        "complexity":
        "high",

        "search_depth":
        "high",

        "subqueries": [

            "Current Nvidia AI chip market share",

            "Nvidia competitors in AI chips",

            "Future AI accelerator trends",

            "Supply chain risks affecting Nvidia",

            "Expert predictions for Nvidia AI chips"
        ],

        "entities": [
            "Nvidia",
            "AI chips",
            "AMD",
            "Intel"
        ],

        "source_types": [
            "news",
            "market_reports",
            "technical_docs"
        ],

        "retrieval_strategy":
        "multi-hop",

        "reasoning_type":
        "comparative",

        "priority_order": [
            "market_reports",
            "expert_analysis",
            "technical_research"
        ]
        }}
        """
    ),

    (
        "human",

        """
        Research Query:

        {query}
        """
    )
])

)

query_planner_chain = (

    planner_prompt
    | llm
    | JsonOutputParser()

)

# 1st Agent
def build_search_agent():
    return create_agent(
        model=llm,
        tools=[web_Search],
        system_prompt="""
        You are a research retrieval expert.

        Your goal is to gather
        high-quality evidence.

        Rules:

        1. Prefer evidence-rich sources:
        - academic papers
        - trusted news
        - government reports
        - technical documentation
        - market research

        2. Avoid:
        - clickbait
        - spam
        - SEO blogs
        - opinion-only content

        3. Prioritize:
        - relevance
        - authority
        - freshness

        4. Retrieve multiple
        relevant perspectives.

        5. Focus on evidence
        that helps answer
        the research query.
        """
    )

# 2nd Agent
def build_scrape_agent():
    return create_agent(
        model=llm,
        tools=[scrape_url],
        system_prompt="""
        You are an expert web content extractor.

        Rules:
        1. Prioritize informative sources.
        2. Ignore ads/navigation text.
        3. Extract factual content only.
        4. Focus on relevance to query.
        """
    )

# write chain
# LCEL chain

writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a world-class investigative research analyst producing premium deep-research dossiers.

CRITICAL OUTPUT REQUIREMENTS:
- Your report MUST be at minimum 3000 words. Short reports are UNACCEPTABLE.
- Every section MUST contain at least 3-4 detailed paragraphs with specific facts, figures, and quotes from the research.
- You MUST include at least 2 markdown tables with real data, comparisons, or metrics extracted from the sources.
- You MUST cite source URLs and academic papers inline using markdown links or author-year format: [Source Name](URL) or (Smith et al., 2024).
- You MUST distinctly reference academic findings vs general web findings. Prioritize academic papers for scientific or factual claims.
- You MUST use dynamic, creative section headers (NOT generic like "Background" — instead use vivid titles like "The Silicon Substrate: How Technology Reshaped the Industry").
- You MUST include bullet-point lists of key statistics, data points, and expert quotes.
- If sources disagree, you MUST analyze the contradictions in detail.
- If evidence is weak on a point, explicitly state uncertainty.
- NEVER invent facts. Only use provided research data.
- Format beautifully with GitHub-flavored markdown: headers, bold, italic, tables, blockquotes, horizontal rules.
- Write in a journalistic, engaging, authoritative tone — like a feature article in The Economist or Nature."""
    ),

    ("human", """Write an EXHAUSTIVE deep-research dossier on this topic. This must be a comprehensive, publication-quality report.

Topic: {topic}

Research Data:
{research}

MANDATORY STRUCTURE (adapt headers to be dynamic and topic-relevant):

## 1. Executive Summary
- 2-3 paragraph high-level synthesis of ALL key findings
- Include the single most important statistic or insight discovered

## 2. Historical Context & Evolution
- How did this topic/field emerge and evolve?
- Key milestones, turning points, and paradigm shifts
- Include a timeline table if applicable

## 3. Current Landscape & Core Mechanisms
- Deep technical or conceptual analysis of how things work TODAY
- Key players, organizations, technologies, or frameworks involved
- Include a comparison table of major approaches/solutions/players

## 4. Data Deep-Dive: By The Numbers
- ALL statistics, market data, metrics found in the research
- Present as markdown tables with clear headers
- Analyze what the numbers mean — don't just list them

## 5. Challenges, Criticisms & Risk Factors
- What are the major obstacles, controversies, or failure modes?
- Expert opinions and counter-arguments
- Real-world case studies of failures or setbacks

## 6. Innovation Frontier & Future Outlook
- Cutting-edge developments and emerging trends
- Expert predictions and forecasts
- What will this look like in 5-10 years?

## 7. Conclusion & Key Takeaways
- Synthesize the 5 most important insights
- Actionable implications for stakeholders

## 8. Academic & Web Sources
- List ALL source URLs and academic papers referenced in the report. Separate them into "Academic Papers" and "Web Sources" if possible.

REMEMBER: Minimum 3000 words. Be EXHAUSTIVE. Every section needs deep, specific content with data and citations. DO NOT write a surface-level summary.""")
])



write_chain = writer_prompt | llm | StrOutputParser()

# critic chain above report promt will be sent here in critic chain
 
critic_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
        You are a strict research evaluator.

        Evaluate:
        - depth
        - structure
        - factuality
        - completeness
        - hallucination risk
        - proper use of academic vs web sources
        """
    ),
    (
        "human",
        """
        Report:
        {report}

        Return EXACTLY:

        Research Depth: X/10
        Structure: X/10
        Source Reliability: X/10
        Hallucination Risk: Low/Medium/High
        Overall Score: X/10

        Strengths:
        - ...

        Weaknesses:
        - ...

        Final Verdict:
        ...
        """
    )
])
critic_chain = critic_prompt | llm | StrOutputParser()

# ==========================
# FOLLOW-UP CHAT CHAIN
# ==========================

chat_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful research assistant. A deep research report has been generated for the user.
        Answer the user's follow-up questions based ONLY on the report content below.
        If the answer isn't in the report, say so clearly (do not hallucinate outside information).
        Cite specific sections and sources from the report when answering.
        
        Research Report Context:
        {report}"""
    ),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{message}")
])

chat_chain = chat_prompt | llm | StrOutputParser()


# ==========================
# Local Planner Testing
# ==========================

if __name__ == "__main__":

    query = (
        "Future of Nvidia AI chips"
    )

    result = (
        query_planner_chain
        .invoke({

            "query":
            query
        })
    )

    print("\nPlanner Output:\n")

    print(result)