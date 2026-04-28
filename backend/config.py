import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # LLM API Keys
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Redis configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Swarm configuration
    NUM_AGENTS: int = int(os.getenv("NUM_AGENTS", "5"))
    ALPHA: float = float(os.getenv("ALPHA", "0.3"))
    EPSILON: float = float(os.getenv("EPSILON", "0.2"))

config = Config()
