# Synthetic speech samples

Five short Indonesian check-in recordings used to exercise the real
speech-to-text path end to end.

**These have no expected transcription or facts attached, so they cannot catch
an accuracy regression.** The live runner only asserts that
`transcription_provider` comes back populated; a transcriber that garbles every
sample passes. That is a deliberate gap, not an oversight — transcription
accuracy needs real consented recordings of real voices, which is not something
to synthesise into a repo.

What they are good for today: proving the provider is reachable, the route and
multipart wiring work, the error mapping holds, and the response shape matches
the contract.

To close the gap properly, the samples need to be recorded and consented by
people whose speech resembles the patient population, with a reviewed
transcript attached to each — the same standard `extraction/cases.jsonl` already
meets for text. Until that exists, treat audio accuracy as unmeasured rather
than as good.

Never commit a recording of a real patient.