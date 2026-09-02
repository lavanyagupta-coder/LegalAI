"""
AI analysis layer for LegalAI.

Talks to any OpenAI-compatible Chat Completions API. Configured entirely
through environment variables so you can point it at OpenAI itself, Azure
OpenAI, OpenRouter, Groq, a local vLLM/Ollama server, etc. without touching
code:

    OPENAI_API_KEY   required  - the provider's API key
    OPENAI_BASE_URL  optional  - override if not talking to api.openai.com
                                  e.g. https://openrouter.ai/api/v1
                                       https://<resource>.openai.azure.com/openai/v1
    OPENAI_MODEL     optional  - defaults to "gpt-4o-mini"
    OPENAI_ORG_ID    optional  - OpenAI organization id, if applicable
"""

import json
import os
from typing import Any, Optional

from dotenv import load_dotenv
from openai import (
    OpenAI,
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

load_dotenv()

MAX_SOURCE_CHARS = 16000
DEFAULT_MODEL = "gpt-4o-mini"

_client: Optional[OpenAI] = None
_client_key: Optional[str] = None


class AIConfigError(Exception):
    """Raised when no AI provider key is configured."""


def is_configured() -> bool:
    """Whether an API key is currently set (checked live, not cached)."""
    return bool(os.getenv("OPENAI_API_KEY"))


def current_model() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_MODEL)


def current_base_url() -> Optional[str]:
    return os.getenv("OPENAI_BASE_URL") or None


def _get_client() -> Optional[OpenAI]:
    """Build (and cache) the client. Re-builds automatically if the key
    changes at runtime, e.g. after editing .env and reloading."""
    global _client, _client_key

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    if _client is not None and _client_key == api_key:
        return _client

    kwargs: dict[str, Any] = {"api_key": api_key}
    base_url = os.getenv("OPENAI_BASE_URL")
    if base_url:
        kwargs["base_url"] = base_url
    org_id = os.getenv("OPENAI_ORG_ID")
    if org_id:
        kwargs["organization"] = org_id

    _client = OpenAI(**kwargs)
    _client_key = api_key
    return _client


def _truncate_text(text: str) -> str:
    cleaned = (text or "").strip()
    if len(cleaned) <= MAX_SOURCE_CHARS:
        return cleaned
    return cleaned[:MAX_SOURCE_CHARS]


def _strip_code_fences(content: str) -> str:
    cleaned = (content or "").strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 3:
            cleaned = parts[1]
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:]
    return cleaned.strip()


def _chat_completion(
    messages: list[dict[str, str]],
    max_tokens: int = 900,
    want_json: bool = False,
) -> str:
    """Call the configured provider. Raises AIConfigError if no key is set,
    otherwise lets the caller handle OpenAI SDK exceptions."""
    client = _get_client()
    if client is None:
        raise AIConfigError(
            "No AI provider API key is configured. Set OPENAI_API_KEY "
            "(and optionally OPENAI_BASE_URL / OPENAI_MODEL) in your .env file."
        )

    base_kwargs: dict[str, Any] = dict(
        model=current_model(),
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
    )

    if want_json:
        try:
            response = client.chat.completions.create(
                response_format={"type": "json_object"}, **base_kwargs
            )
            return response.choices[0].message.content.strip()
        except APIStatusError:
            # Some OpenAI-compatible providers (older proxies, certain local
            # servers) reject response_format. Fall back to a plain call and
            # rely on prompt instructions + _strip_code_fences downstream.
            pass

    response = client.chat.completions.create(**base_kwargs)
    return response.choices[0].message.content.strip()


def _normalize_severity(value: str) -> str:
    level = (value or "").strip().lower()
    if level.startswith("high"):
        return "High"
    if level.startswith("medium"):
        return "Medium"
    if level.startswith("low"):
        return "Low"
    return "Medium"


def _safe_json_loads(content: str) -> Optional[dict[str, Any]]:
    try:
        parsed = json.loads(_strip_code_fences(content))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def _fallback_analysis(text: str, reason: str = "No summary available.") -> dict[str, Any]:
    snippet = " ".join(text.split())[:500]
    return {
        "summary": snippet or reason,
        "risk_level": "Unknown",
        "risk_summary": reason,
        "risks": [],
        "clauses": [],
        "recommendations": [],
        "document_type": "Legal document",
    }


def _error_result(message: str) -> dict[str, Any]:
    return {
        "summary": message,
        "risk_level": "Unknown",
        "risk_summary": message,
        "risks": [],
        "clauses": [],
        "recommendations": [],
        "document_type": "Unknown",
    }


def analyze_document(text: str) -> dict[str, Any]:
    """Generate a structured legal analysis payload from document text."""
    if not text.strip():
        return _error_result("No readable text found in the uploaded file.")

    if not is_configured():
        return _error_result(
            "No AI provider API key is configured. Set OPENAI_API_KEY in your .env file."
        )

    prompt_text = _truncate_text(text)

    try:
        content = _chat_completion(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a legal document analyzer. Return valid JSON only, "
                        "with no preamble and no markdown code fences. "
                        "The JSON must have these keys: "
                        "document_type, summary, risk_level, risk_summary, risks, clauses, recommendations. "
                        "risk_level must be one of High, Medium, Low. "
                        "risks must be an array of objects with title, severity, description, category. "
                        "clauses must be an array of objects with title, summary, risk. "
                        "recommendations must be an array of short strings. "
                        "Keep the summary concise and plain-language."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Analyze this legal document and extract the most important issues.\n\n"
                        f"{prompt_text}"
                    ),
                },
            ],
            max_tokens=1400,
            want_json=True,
        )
        parsed = _safe_json_loads(content) or _fallback_analysis(
            prompt_text, "The AI response could not be parsed as structured data."
        )
    except AIConfigError as e:
        return _error_result(str(e))
    except AuthenticationError:
        return _error_result(
            "AI provider rejected the API key (authentication error). Double-check OPENAI_API_KEY."
        )
    except RateLimitError:
        return _error_result(
            "AI provider rate limit or quota exceeded. Please wait and try again, or check billing."
        )
    except APITimeoutError:
        return _error_result("The AI provider request timed out. Please try again.")
    except APIConnectionError:
        return _error_result(
            "Could not reach the AI provider. Check your network and OPENAI_BASE_URL."
        )
    except APIError as e:
        return _error_result(f"AI provider returned an error: {e}")
    except Exception as e:  # noqa: BLE001 - last-resort safety net
        print(f"Unexpected error during document analysis: {e}")
        return _fallback_analysis(prompt_text, "Unable to analyze this document.")

    risks = []
    for risk in parsed.get("risks", []):
        if not isinstance(risk, dict):
            continue
        risks.append(
            {
                "title": str(risk.get("title") or "Risk"),
                "severity": _normalize_severity(str(risk.get("severity") or "Medium")),
                "description": str(risk.get("description") or ""),
                "category": str(risk.get("category") or "General"),
            }
        )

    clauses = []
    for clause in parsed.get("clauses", []):
        if not isinstance(clause, dict):
            continue
        clauses.append(
            {
                "title": str(clause.get("title") or "Clause"),
                "summary": str(clause.get("summary") or ""),
                "risk": _normalize_severity(str(clause.get("risk") or "Medium")),
            }
        )

    recommendations = [
        str(item).strip() for item in parsed.get("recommendations", []) if str(item).strip()
    ]

    return {
        "document_type": str(parsed.get("document_type") or "Legal document"),
        "summary": str(parsed.get("summary") or "No summary available."),
        "risk_level": _normalize_severity(str(parsed.get("risk_level") or "Medium")),
        "risk_summary": str(parsed.get("risk_summary") or "No risk summary available."),
        "risks": risks,
        "clauses": clauses,
        "recommendations": recommendations,
    }


def summarize_text(text: str) -> str:
    return analyze_document(text).get("summary", "Unable to generate summary.")


def analyze_risk(text: str) -> dict[str, Any]:
    analysis = analyze_document(text)
    return {
        "risk": analysis.get("risk_level", "Unknown"),
        "message": analysis.get("risk_summary", "No risk summary available."),
        "analysis": analysis.get("risk_summary", "No risk summary available."),
        "risks": analysis.get("risks", []),
        "document_type": analysis.get("document_type", "Legal document"),
        "recommendations": analysis.get("recommendations", []),
    }


def extract_clauses(text: str) -> list[dict[str, str]]:
    return analyze_document(text).get("clauses", [])


def compare_documents(text1: str, text2: str) -> dict[str, str]:
    """Compares two legal documents using the configured AI provider."""
    if not text1.strip() or not text2.strip():
        return {"comparison": "Unable to compare - one or both documents are empty."}

    if not is_configured():
        return {"comparison": "Unable to compare documents because OPENAI_API_KEY is not configured."}

    try:
        comparison = _chat_completion(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a legal document comparison expert. Compare two legal "
                        "documents and highlight key differences, similarities, and implications."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Compare these two legal documents and highlight key differences, "
                        "similarities, and potential implications:\n\n"
                        f"Document 1:\n{_truncate_text(text1)}\n\nDocument 2:\n{_truncate_text(text2)}"
                    ),
                },
            ],
            max_tokens=700,
        )
        return {"comparison": comparison}
    except AIConfigError as e:
        return {"comparison": str(e)}
    except AuthenticationError:
        return {"comparison": "Unable to compare documents: AI provider rejected the API key."}
    except RateLimitError:
        return {"comparison": "Unable to compare documents: rate limit or quota exceeded."}
    except APITimeoutError:
        return {"comparison": "Unable to compare documents: the request timed out."}
    except APIConnectionError:
        return {"comparison": "Unable to compare documents: could not reach the AI provider."}
    except APIError as e:
        return {"comparison": f"Unable to compare documents: provider error ({e})."}
    except Exception as e:  # noqa: BLE001
        print(f"Unexpected error during document comparison: {e}")
        return {"comparison": "Unable to compare documents."}