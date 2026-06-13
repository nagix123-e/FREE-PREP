# SATprep Passage Extraction Pipeline

This tool prepares short public-domain literature passages for manual review and later upload to a Custom GPT knowledge base. It does not download texts, determine legal clearance, or generate SAT questions.

## Workflow

1. Place manually downloaded `.txt`, `.html`, or `.htm` files in `raw_texts/`.
2. Add one metadata file per work in `passage_metadata/`. The script requires `work_id`, `title`, `author`, `source_name`, `rights_note`, and `raw_file`.
3. Run extraction:

   ```bash
   python3 -m passage_pipeline extract
   ```

4. Review `passage_outputs/candidate_passages.jsonl` line by line. Keep `status` as `candidate`, or change it to `approved` or `rejected`. Add `reviewer_note` when useful.
5. Export approved passages:

   ```bash
   python3 -m passage_pipeline export-approved
   ```

## Output Files

- `passage_outputs/candidate_passages.jsonl`: candidate passages with scores and `status: candidate`.
- `passage_outputs/approved_passages.jsonl`: only manually approved passages.
- `passage_outputs/approved_passages.md`: text-forward Markdown export for Custom GPT review/upload.

Existing approved export files are copied to timestamped `.bak` files before being overwritten.

## Legal Review Requirement

Rights notes are metadata supplied by a human reviewer. The script preserves them but does not claim legal clearance. Before approving passages, confirm that each source is appropriate for the intended jurisdiction and product use.

The cleaner removes common Project Gutenberg headers, footers, and license boilerplate. Final passages should still be manually checked so no boilerplate, chapter headings, tables of contents, or footnotes are approved.

## Candidate Rules

Candidates are built from sentence groups and must be 25-150 words. The scorer records:

- `word_count`
- `sentence_count`
- `avg_sentence_length`
- `proper_noun_count`
- `dialogue_ratio`
- `archaic_marker_count`

The extractor rejects candidates that are too short or long, look like headings/contents/footnotes, contain too many proper nouns, or are mostly dialogue.

## Custom Paths

```bash
python3 -m passage_pipeline extract \
  --raw-dir raw_texts \
  --metadata-dir passage_metadata \
  --output passage_outputs/candidate_passages.jsonl

python3 -m passage_pipeline export-approved \
  --input passage_outputs/candidate_passages.jsonl \
  --jsonl passage_outputs/approved_passages.jsonl \
  --markdown passage_outputs/approved_passages.md
```
