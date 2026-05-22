# create_agent 
#Since you're building a multi-agent system, this setup represents a single "node" or "worker." In a full multi-agent orchestration, you would eventually wrap these executors into a LangGraph workflow.

import os
import warnings
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

from langchain.agents import AgentExecutor
from langchain.agents import create_react_agent

from langchain_core.prompts import PromptTemplate

from backend.tools import web_Search, scrape_url

from langchain_core.prompts import PromptTemplate

load_dotenv()
warnings.filterwarnings("ignore", category=DeprecationWarning)

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    temperature=0, # Set to 0 for consistent tool use in agents
    max_retries=2,
)

tools = [web_Search, scrape_url]

#define the ReAct Prompt 
template = """
    You are a research assistant. Answer the following questions as best you can. 
    You have access to the following tools:

    {tools}

    Use the following format:

    Question: the input question you must answer
    Thought: you should always think about what to do
    Action: the action to take, should be one of [{tool_names}]
    Action Input: the input to the action
    Observation: the result of the action
    ... (this Thought/Action/Action Input/Observation can repeat N times)
    Thought: I now know the final answer
    Final Answer: the final answer to the original input question

    Begin!

    Question: {input}
    Thought: {agent_scratchpad}
"""

# prompt = hub.pull("hwchase17/react")
prompt = PromptTemplate.from_template(template)

# construct react agent
agent = create_react_agent(llm, tools, prompt)

agent_executor = AgentExecutor(
    agent = agent, 
    tools = tools, 
    verbose = True,
    handle_parsing_errors = True
)

# Create the Executor (This is what actually "runs" the agent) and Test the agent 
# response = agent_executor.invoke({"input": "what do you mean by High Trading Frequency Firms?"})
if __name__ == "__main__":
    response = agent_executor.invoke({"input": "What are the latest developments in AI in May 2026?"})
    print("\n--- FINAL ANSWER ---\n")
    print(response["output"])


# LCEL pipeline
# custom_chain = agent | (lambda x: x["output"].upper())



