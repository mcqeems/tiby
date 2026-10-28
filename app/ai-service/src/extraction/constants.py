"""Constants and keyword rules for the rule-based extractor and mapper."""

import re

SYMPTOMS = (
    "mual",
    "muntah",
    "tidak nafsu makan",
    "pusing",
    "lemas",
    "sesak napas",
    "sesak",
    "ruam",
    "gatal",
    "demam",
    "nyeri",
)

STOP_PHRASES = (
    "ingin berhenti",
    "mau berhenti",
    "tidak mau minum obat",
    "nggak mau minum obat",
    "tidak mau melanjutkan",
    "gak mau lanjut",
)

NUMBER_WORDS = {
    "satu": 1,
    "dua": 2,
    "tiga": 3,
    "empat": 4,
    "lima": 5,
    "enam": 6,
    "tujuh": 7,
    "delapan": 8,
    "sembilan": 9,
    "sepuluh": 10,
}

KNOWN_SYMPTOMS = {
    "batuk darah": "BATUK_DARAH",
    "sesak": "SESAK_NAPAS",
    "kuning": "KUNING_IKTERIK",
    "muntah hebat": "MUNTAH_HEBAT",
    "gangguan penglihatan": "GANGGUAN_PENGLIHATAN",
    "gangguan pendengaran": "GANGGUAN_PENDENGARAN",
    "ruam": "RUAM_KULIT_BERAT",
    "demam tinggi": "DEMAM_TINGGI_MENETAP",
    "urine merah": "URINE_MERAH",
    "mual": "MUAL_RINGAN",
    "nyeri sendi": "NYERI_SENDI_RINGAN",
    "lemas": "MENGANTUK_LEMAS",
}

# Precompiled regex (biar cepat & DRY)
DOSE_DIGIT_PATTERN = re.compile(r"\b(\d{1,2})\s*(?:biji|butir|tablet|pil)\b")
_WORDS_ALTERNATION = "|".join(NUMBER_WORDS)
DOSE_WORD_PATTERN = re.compile(
    rf"\b({_WORDS_ALTERNATION})\s*(?:biji|butir|tablet|pil)\b"
)
