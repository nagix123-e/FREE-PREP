"""Candidate scoring and rejection rules for SATprep passages."""

from __future__ import annotations

import re
from dataclasses import dataclass

WORD_RE = re.compile(r"\b[\w']+\b", re.UNICODE)
PROPER_NOUN_RE = re.compile(r"\b[A-Z][a-z]+(?:'[a-z]+)?\b")
QUOTE_RE = re.compile(r'"[^"]*"|“[^”]*”|‘[^’]*’')

ARCHAIC_MARKERS = {
    "thou",
    "thee",
    "thy",
    "thine",
    "hath",
    "doth",
    "ere",
    "whilst",
    "wherefore",
    "nay",
    "ye",
    "unto",
}

HEADING_PATTERNS = [
    re.compile(r"^\s*(chapter|book|volume|part)\s+([ivxlcdm]+|\d+)\.?\s*$", re.I),
    re.compile(r"^\s*(contents|table of contents|footnotes?|endnotes?)\s*$", re.I),
    re.compile(r"\.{4,}\s*\d+\s*$"),
    re.compile(r"^\s*\[\d+\]"),
    re.compile(r"project gutenberg|transcriber's note|etext|ebook", re.I),
]


@dataclass(frozen=True)
class PassageScore:
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    proper_noun_count: int
    dialogue_ratio: float
    archaic_marker_count: int


def count_words(text: str) -> int:
    return len(WORD_RE.findall(text))


def score_candidate(text: str, sentence_count: int) -> PassageScore:
    words = WORD_RE.findall(text)
    word_count = len(words)
    proper_nouns = _count_proper_nouns(text)
    quoted_chars = sum(len(match.group(0)) for match in QUOTE_RE.finditer(text))
    dialogue_ratio = quoted_chars / len(text) if text else 0
    archaic_count = sum(1 for word in words if word.lower() in ARCHAIC_MARKERS)

    return PassageScore(
        word_count=word_count,
        sentence_count=sentence_count,
        avg_sentence_length=round(word_count / sentence_count, 2) if sentence_count else 0,
        proper_noun_count=proper_nouns,
        dialogue_ratio=round(dialogue_ratio, 3),
        archaic_marker_count=archaic_count,
    )


def rejection_reason(text: str, score: PassageScore) -> str | None:
    if score.word_count < 25:
        return "word_count_below_25"
    if score.word_count > 150:
        return "word_count_above_150"
    if _looks_like_heading_or_notes(text):
        return "heading_toc_or_footnote"
    if score.proper_noun_count > 12 or score.proper_noun_count / max(score.word_count, 1) > 0.18:
        return "too_many_proper_nouns"
    if score.dialogue_ratio > 0.45:
        return "excessive_dialogue"
    if _has_unbalanced_dialogue(text):
        return "dialogue_fragment"
    return None


def _count_proper_nouns(text: str) -> int:
    count = 0
    sentence_start_words = {
        match.group(1)
        for match in re.finditer(r"(?:^|[.!?]\s+)([A-Z][a-z]+(?:'[a-z]+)?)", text)
    }

    for match in PROPER_NOUN_RE.finditer(text):
        word = match.group(0)
        if word in sentence_start_words or word == "I":
            continue
        count += 1
    return count


def _looks_like_heading_or_notes(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    if len(lines) <= 3 and all(pattern.search(stripped) for pattern in HEADING_PATTERNS[:1]):
        return True
    return any(pattern.search(stripped) for pattern in HEADING_PATTERNS)


def _has_unbalanced_dialogue(text: str) -> bool:
    return text.count('"') % 2 == 1 or text.count("“") != text.count("”")

