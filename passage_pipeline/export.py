"""Export helpers for candidate and approved passage files."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

APPROVED_REQUIRED_FIELDS = {
    "id",
    "work_id",
    "text",
    "word_count",
    "title",
    "author",
    "source_name",
    "rights_note",
    "status",
}


def write_jsonl(records: list[dict], output_path: Path, backup_existing: bool = False) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if backup_existing:
        _backup_if_exists(output_path)
    with output_path.open("w", encoding="utf-8", newline="\n") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def load_jsonl(input_path: Path) -> list[dict]:
    records: list[dict] = []
    with input_path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                records.append(json.loads(stripped))
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at {input_path}:{line_number}: {error}") from error
    return records


def approved_records(records: list[dict]) -> list[dict]:
    approved = [record for record in records if record.get("status") == "approved"]
    for record in approved:
        missing = sorted(APPROVED_REQUIRED_FIELDS - set(record))
        if missing:
            raise ValueError(f"Approved passage {record.get('id', '<missing id>')} is missing: {', '.join(missing)}")
        if not 25 <= int(record["word_count"]) <= 150:
            raise ValueError(f"Approved passage {record['id']} has invalid word_count {record['word_count']}")
    return approved


def write_markdown(records: list[dict], output_path: Path, backup_existing: bool = False) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if backup_existing:
        _backup_if_exists(output_path)

    parts = ["# Approved SATprep Passages", ""]
    for record in records:
        parts.extend(
            [
                f"## {record['id']}: {record['title']}",
                "",
                f"- Author: {record['author']}",
                f"- Source: {record['source_name']}",
                f"- Rights note: {record['rights_note']}",
                f"- Word count: {record['word_count']}",
                "",
                record["text"],
                "",
            ]
        )
    output_path.write_text("\n".join(parts), encoding="utf-8", newline="\n")


def _backup_if_exists(path: Path) -> None:
    if not path.exists():
        return
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = path.with_name(f"{path.name}.{timestamp}.bak")
    shutil.copy2(path, backup_path)

