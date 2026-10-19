# Synthetic speech samples

Five short Indonesian check-in recordings, each with its expected transcript in
`ground_truth.jsonl`.

They exercise the real speech-to-text path end to end: provider reachability,
route and multipart wiring, error mapping, response contract.

**Nothing scores those transcripts yet.** The live runner only asserts
`transcription_provider` comes back populated, so a transcriber that garbles
every sample still passes. The labels exist; what catches a regression does not.
Closing that gap properly needs consented recordings of voices resembling the
patient population, which is not something to synthesise into a repo.

Never commit a recording of a real patient.