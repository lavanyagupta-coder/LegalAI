import json
import os
from typing import Any

import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

MAX_SOURCE_CHARS = 16000


def _ensure_api_key() -> bool:
    if not openai.api_key:
        openai.api_key = os.getenv("OPENAI_API_KEY")
    return bool(openai.api_key)


def _truncate_text(text: str) -> str:
    cleaned = (text or "").strip()
    if len(cleaned) <= MAX_SOURCE_CHARS:
        return cleaned
    return cleaned[:MAX_SOURCE_CHARS]


def _strip_code_fences(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 3:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    return cleaned.strip()


def _chat_completion(messages: list[dict[str, str]], max_tokens: int = 900) -> str:
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
    )
    return response.choices[0].message["content"].strip()


def _normalize_severity(value: str) -> str:
    level = (value or "").strip().lower()
    if level.startswith("high"):
        return "High"
    if level.startswith("medium"):
        return "Medium"
    if level.startswith("low"):
        return "Low"
    return "Medium"


def _safe_json_loads(content: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(_strip_code_fences(content))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def _fallback_analysis(text: str) -> dict[str, Any]:
    snippet = " ".join(text.split())[:500]
    return {
        "summary": snippet or "No summary available.",
        "risk_level": "Unknown",
        "risk_summary": "Structured analysis could not be generated.",
        "risks": [],
        "clauses": [],
        "recommendations": [],
        "document_type": "Legal document",
    }


def analyze_document(text: str) -> dict[str, Any]:
    """Generate a structured legal analysis payload from document text."""
    if not text.strip():
        return {
            "summary": "No text found in document.",
            "risk_level": "Unknown",
            "risk_summary": "No readable text found in the uploaded file.",
            "risks": [],
            "clauses": [],
            "recommendations": [],
            "document_type": "Unknown",
        }

    if not _ensure_api_key():
        return {
            "summary": "OPENAI_API_KEY is not configured.",
            "risk_level": "Unknown",
            "risk_summary": "OPENAI_API_KEY is not configured.",
            "risks": [],
            "clauses": [],
            "recommendations": [],
            "document_type": "Unknown",
        }

    prompt_text = _truncate_text(text)

    try:
        content = _chat_completion(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a legal document analyzer. Return valid JSON only. "
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
        )
        parsed = _safe_json_loads(content) or _fallback_analysis(prompt_text)
    except openai.error.AuthenticationError as e:
        print(f"OpenAI Authentication Error: {e}")
        return {
            "summary": "Unable to generate summary due to OpenAI authentication error.",
            "risk_level": "Unknown",
            "risk_summary": "Unable to analyze risk due to OpenAI authentication error.",
            "risks": [],
            "clauses": [],
            "recommendations": [],
            "document_type": "Unknown",
        }
    except openai.OpenAIError as e:
        print(f"OpenAI API Error: {e}")
        return {
            "summary": "Unable to generate summary due to OpenAI API issue.",
            "risk_level": "Unknown",
            "risk_summary": "Unable to analyze risk due to OpenAI API issue.",
            "risks": [],
            "clauses": [],
            "recommendations": [],
            "document_type": "Unknown",
        }
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return _fallback_analysis(prompt_text)

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
        str(item).strip()
        for item in parsed.get("recommendations", [])
        if str(item).strip()
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
    """Compares two legal documents using the OpenAI API."""
    if not text1.strip() or not text2.strip():
        return {"comparison": "Unable to compare - one or both documents are empty."}

    if not _ensure_api_key():
        return {"comparison": "Unable to compare documents because OPENAI_API_KEY is not configured."}

    try:
        comparison = _chat_completion(
            [
                {
                    "role": "system",
                    "content": "You are a legal document comparison expert. Compare two legal documents and highlight key differences, similarities, and implications.",
                },
                {
                    "role": "user",
                    "content": (
                        "Compare these two legal documents and highlight key differences, similarities, and potential implications:\n\n"
                        f"Document 1:\n{_truncate_text(text1)}\n\nDocument 2:\n{_truncate_text(text2)}"
                    ),
                },
            ],
            max_tokens=700,
        )
        return {"comparison": comparison}
    except openai.error.AuthenticationError as e:
        print(f"OpenAI Authentication Error: {e}")
        return {"comparison": "Unable to compare documents due to OpenAI authentication error."}
    except openai.OpenAIError as e:
        print(f"OpenAI API Error: {e}")
        return {"comparison": "Unable to compare documents due to API error."}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"comparison": "Unable to compare documents."}
