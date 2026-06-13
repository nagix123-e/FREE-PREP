"""Command-line entrypoint for the SATprep passage pipeline."""

from __future__ import annotations

import argparse
from pathlib import Path

from .export import approved_records, load_jsonl, write_jsonl, write_markdown
from .extract import extract_candidates


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare public-domain literature passages for SATprep.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract_parser = subparsers.add_parser("extract", help="Extract candidate passages from local raw texts.")
    extract_parser.add_argument("--raw-dir", type=Path, default=Path("raw_texts"))
    extract_parser.add_argument("--metadata-dir", type=Path, default=Path("passage_metadata"))
    extract_parser.add_argument("--output", type=Path, default=Path("passage_outputs/candidate_passages.jsonl"))

    approved_parser = subparsers.add_parser("export-approved", help="Export manually approved passages.")
    approved_parser.add_argument("--input", type=Path, default=Path("passage_outputs/candidate_passages.jsonl"))
    approved_parser.add_argument("--jsonl", type=Path, default=Path("passage_outputs/approved_passages.jsonl"))
    approved_parser.add_argument("--markdown", type=Path, default=Path("passage_outputs/approved_passages.md"))

    args = parser.parse_args()

    if args.command == "extract":
        records = extract_candidates(args.raw_dir, args.metadata_dir)
        write_jsonl(records, args.output)
        print(f"Wrote {len(records)} candidate passages to {args.output}")
        return

    if args.command == "export-approved":
        records = approved_records(load_jsonl(args.input))
        write_jsonl(records, args.jsonl, backup_existing=True)
        write_markdown(records, args.markdown, backup_existing=True)
        print(f"Wrote {len(records)} approved passages to {args.jsonl} and {args.markdown}")


if __name__ == "__main__":
    main()
