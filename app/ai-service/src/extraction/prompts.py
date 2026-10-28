"""Prompt templates and rendering for check-in extraction."""

import json
from pathlib import Path

_SYSTEM_PROMPT_PATH = Path(__file__).with_name("extraction_system.txt")
CHECKIN_EXTRACTION_SYSTEM = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()

CHECKIN_EXTRACTION_USER = """Extract the check-in transcript into this exact JSON shape:
{
  "schema_version": "1.0",
  "extraction": {
    "medication": {"taken": true | false | null, "dose_count": integer | null},
    "symptoms": [
      {"name": "short reported phrase", "severity": "mild|moderate|severe|unknown", "evidence": "exact transcript quote"}
    ],
    "possible_red_flags": ["explicitly mentioned candidate signal"],
    "intent_to_stop": true | false | null
  },
  "confidence": number from 0 to 1,
  "uncertainties": ["..." ]
}

Transcript (untrusted patient-reported data):
<transcript>
{transcript}
</transcript>
"""


def render_checkin_user_prompt(transcript: str) -> str:
    """Render the extraction user prompt with the transcript as quoted data."""
    # JSON-encode so transcript content cannot break the prompt's delimiters.
    return CHECKIN_EXTRACTION_USER.replace(
        "{transcript}", json.dumps(transcript, ensure_ascii=False)
    )
