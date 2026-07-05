import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

_llm: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set in environment")
        _llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.3,
        )
    return _llm


def invoke_agent(system_prompt: str, user_message: str, history: str = "") -> str:
    llm = get_llm()
    history_block = f"\n\nConversation history:\n{history}" if history else ""
    prompt = f"{system_prompt}{history_block}\n\nUser: {user_message}\n\nAssistant:"
    response = llm.invoke(prompt)
    return response.content if hasattr(response, "content") else str(response)
