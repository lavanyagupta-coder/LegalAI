import os
import subprocess
import xml.etree.ElementTree as ET
import zipfile

import PyPDF2


WORD_NAMESPACE = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def _extract_text_from_pdf(file_path: str) -> str:
    with open(file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        pages = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text.strip())
        return "\n\n".join(pages)


def _extract_text_from_docx(file_path: str) -> str:
    with zipfile.ZipFile(file_path) as docx_archive:
        with docx_archive.open("word/document.xml") as document_xml:
            tree = ET.parse(document_xml)

    paragraphs = []
    for paragraph in tree.findall(".//w:p", WORD_NAMESPACE):
        text_parts = [
            node.text.strip()
            for node in paragraph.findall(".//w:t", WORD_NAMESPACE)
            if node.text and node.text.strip()
        ]
        if text_parts:
            paragraphs.append(" ".join(text_parts))

    return "\n".join(paragraphs)


def _extract_text_from_txt(file_path: str) -> str:
    encodings = ("utf-8", "utf-16", "latin-1")
    for encoding in encodings:
        try:
            with open(file_path, "r", encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue
    return ""


def _extract_text_from_doc(file_path: str) -> str:
    # Legacy .doc is difficult to parse without system tooling; `strings`
    # provides a best-effort fallback that is often enough for plain text recovery.
    result = subprocess.run(
        ["strings", "-n", "6", file_path],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return ""

    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return "\n".join(lines)


def extract_text_from_document(file_path: str) -> str:
    """Extract text from supported document types."""
    try:
        _, ext = os.path.splitext(file_path.lower())

        if ext == ".pdf":
            return _extract_text_from_pdf(file_path)
        if ext == ".docx":
            return _extract_text_from_docx(file_path)
        if ext == ".doc":
            return _extract_text_from_doc(file_path)
        if ext == ".txt":
            return _extract_text_from_txt(file_path)

        return _extract_text_from_txt(file_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return ""

def extract_text_from_pdf(file_path: str) -> str:
    """Backward-compatible alias used by the existing backend."""
    return extract_text_from_document(file_path)


read_pdf = extract_text_from_document



