"""Load, clean, and split local public-domain source files."""

from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

from .scoring import rejection_reason, score_candidate

SUPPORTED_EXTENSIONS = {".txt", ".html", ".htm"}
SENTENCE_RE = re.compile(r"[^.!?]+(?:[.!?]+[\"”']?|$)", re.MULTILINE)


@dataclass(frozen=True)
class Work:
    work_id: str
    title: str
    author: str
    source_name: str
    rights_note: str
    raw_file: str
    publication_year: int | None = None
    source_url: str | None = None
    jurisdiction_note: str | None = None
    genre: str | None = None


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "nav", "footer"}:
            self.skip_depth += 1
        if tag in {"p", "br", "div", "section", "article", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "nav", "footer"} and self.skip_depth:
            self.skip_depth -= 1
        if tag in {"p", "div", "section", "article", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        return html.unescape("".join(self.parts))


def load_works(metadata_dir: Path, raw_dir: Path) -> list[Work]:
    metadata_dir = _safe_existing_dir(metadata_dir)
    raw_dir = _safe_existing_dir(raw_dir)
    works: list[Work] = []

    for path in sorted(metadata_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        _require_fields(data, path)
        raw_path = _safe_child(raw_dir, data["raw_file"])
        if raw_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported source extension in {path}: {raw_path.suffix}")
        if not raw_path.exists():
            raise FileNotFoundError(f"Metadata file {path} references missing raw file {raw_path}")
        works.append(Work(**data))

    return works


def extract_candidates(raw_dir: Path, metadata_dir: Path) -> list[dict]:
    raw_dir = _safe_existing_dir(raw_dir)
    works = load_works(metadata_dir, raw_dir)
    passages: list[dict] = []
    next_id = 1

    for work in works:
        raw_path = _safe_child(raw_dir, work.raw_file)
        cleaned = clean_text(raw_path.read_text(encoding="utf-8", errors="replace"), raw_path.suffix)
        for paragraph_index, paragraph in enumerate(split_paragraphs(cleaned), start=1):
            for candidate_text, sentence_count in sentence_group_candidates(paragraph):
                score = score_candidate(candidate_text, sentence_count)
                reason = rejection_reason(candidate_text, score)
                if reason:
                    continue
                passages.append(_passage_record(f"LIT_{next_id:04d}", work, candidate_text, score, paragraph_index))
                next_id += 1

    return passages


def clean_text(raw_text: str, suffix: str = ".txt") -> str:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    if suffix.lower() in {".html", ".htm"}:
        parser = _HTMLTextExtractor()
        parser.feed(text)
        text = parser.text()

    text = _remove_gutenberg_boilerplate(text)
    text = _remove_common_boilerplate_lines(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_paragraphs(text: str) -> list[str]:
    paragraphs = []
    for block in re.split(r"\n\s*\n", text):
        paragraph = " ".join(line.strip() for line in block.splitlines() if line.strip())
        if paragraph:
            paragraphs.append(paragraph)
    return paragraphs


def sentence_group_candidates(paragraph: str) -> Iterable[tuple[str, int]]:
    sentences = [match.group(0).strip() for match in SENTENCE_RE.finditer(paragraph)]
    sentences = [sentence for sentence in sentences if sentence]

    for start in range(len(sentences)):
        grouped: list[str] = []
        for sentence in sentences[start:]:
            grouped.append(sentence)
            text = " ".join(grouped)
            word_count = len(re.findall(r"\b[\w']+\b", text, re.UNICODE))
            if word_count > 150:
                break
            if word_count >= 25:
                yield text, len(grouped)


def _passage_record(passage_id: str, work: Work, text: str, score, paragraph_index: int) -> dict:
    record = {
        "id": passage_id,
        "work_id": work.work_id,
        "title": work.title,
        "author": work.author,
        "source_name": work.source_name,
        "rights_note": work.rights_note,
        "text": text,
        "word_count": score.word_count,
        "status": "candidate",
        "sentence_count": score.sentence_count,
        "avg_sentence_length": score.avg_sentence_length,
        "proper_noun_count": score.proper_noun_count,
        "dialogue_ratio": score.dialogue_ratio,
        "archaic_marker_count": score.archaic_marker_count,
        "paragraph_index": paragraph_index,
    }
    optional_fields = {
        "publication_year": work.publication_year,
        "source_url": work.source_url,
        "jurisdiction_note": work.jurisdiction_note,
        "genre": work.genre,
    }
    record.update({key: value for key, value in optional_fields.items() if value is not None})
    return record


def _remove_gutenberg_boilerplate(text: str) -> str:
    start_match = re.search(r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", text, re.I | re.S)
    if start_match:
        text = text[start_match.end() :]
    end_match = re.search(r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", text, re.I | re.S)
    if end_match:
        text = text[: end_match.start()]
    return text


def _remove_common_boilerplate_lines(text: str) -> str:
    blocked = re.compile(
        r"project gutenberg|produced by|transcribed from|updated editions will replace|"
        r"character set encoding|start of the project gutenberg|end of the project gutenberg",
        re.I,
    )
    lines = [line for line in text.splitlines() if not blocked.search(line)]
    return "\n".join(lines)


def _require_fields(data: dict, path: Path) -> None:
    required = {"work_id", "title", "author", "source_name", "rights_note", "raw_file"}
    missing = sorted(required - set(data))
    if missing:
        raise ValueError(f"Metadata file {path} is missing required fields: {', '.join(missing)}")


def _safe_existing_dir(path: Path) -> Path:
    resolved = path.resolve()
    if not resolved.exists() or not resolved.is_dir():
        raise FileNotFoundError(f"Directory does not exist: {resolved}")
    return resolved


def _safe_child(parent: Path, child: str) -> Path:
    parent = parent.resolve()
    child_path = (parent / child).resolve()
    if parent not in child_path.parents and child_path != parent:
        raise ValueError(f"Path escapes allowed directory: {child}")
    return child_path

