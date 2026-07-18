# VALSEA endpoint probe

- Timestamp (UTC): 2026-07-18T15:17:31.294Z
- Audio fixture provenance: `synthetic-no-pii` (local filename intentionally omitted)
- Authentication: credential sent only in the WebSocket/HTTP Authorization header; the value is never written to this report
- Redaction: response capture and final rendering both remove credentials, credit balance/remaining, phone numbers, and email addresses; `x-credits-used` remains as usage evidence
- Public docs checked:
  - https://valsea.ai/docs/api/transcribe
  - https://valsea.ai/docs/api/annotate
  - https://valsea.ai/docs/api/clarify
  - https://valsea.ai/docs/api/format
  - https://valsea.ai/docs/api/translate
  - https://valsea.ai/docs/realtime

## Summary

| Probe | Endpoint | Status | Latency | Decision |
|---|---|---:|---:|---|
| Batch transcription | `/v1/audio/transcriptions` | 200 OK | 5570 ms | Dùng được |
| Semantic annotation | `/v1/annotations` | 200 OK | 301 ms | Dùng được |
| Brief path: ASR transcribe | `/v1/asr/transcribe` | 404 Not Found | 123 ms | Không xác nhận |
| Brief path: understand | `/v1/understand` | 404 Not Found | 64 ms | Không xác nhận |
| Realtime auto-detect | `/v1/realtime` | session.ready | 559 ms | Dùng được |
| Realtime Vietnamese | `/v1/realtime` | session.ready | 658 ms | Dùng được |
| Realtime language-array negative probe | `/v1/realtime` | error: INVALID_MESSAGE | 270 ms | Không xác nhận |

## Documented capabilities not called

These entries are a static inventory from the public documentation, not live probe results.

| Capability | Endpoint/config | Status | Documentation | Reason |
|---|---|---|---|---|
| Clarification | `/v1/clarifications` | not called | [docs](https://valsea.ai/docs/api/clarify) | Deferred until Phase 02 needs clarification beyond annotation. |
| Formatting | `/v1/formatting` | not called | [docs](https://valsea.ai/docs/api/format) | Deferred because Alove owns the booking output contract. |
| Translation | `/v1/translations` | not called | [docs](https://valsea.ai/docs/api/translate) | Deferred because translation is not required for the Phase 01/02 decision. |
| Realtime diarization (opt-in) | `/v1/realtime with diarize=true` | not called | [docs](https://valsea.ai/docs/realtime) | Not enabled because it is opt-in and documented as additional-credit usage. |

## Implementation decisions

- Batch ASR: 200 OK in 5570 ms. The current Alove build has no upload comparison route; reserve this endpoint for a future uploaded-audio workflow and keep current transcription on realtime WebSocket.
- Annotation: 200 OK in 301 ms. Parse correction/tag fields as optional and never treat tags as validated booking data.
- Brief-only REST paths: ASR 404 Not Found in 123 ms; understand 404 Not Found in 64 ms. Do not build adapters against undocumented 404 paths.
- Realtime: auto session.ready in 559 ms; Vietnamese session.ready in 658 ms; language array error: INVALID_MESSAGE in 270 ms. Simultaneous language arrays are not supported by this probe.

## Batch transcription

- Transport: HTTP
- Endpoint: `/v1/audio/transcriptions`
- Status: 200 OK
- Duration: 5570 ms
- Note: Documented OpenAI-compatible batch ASR endpoint.

```json
{
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-credits-used": "1",
    "x-request-id": "019f75cd-b7b7-741b-95ae-b0c1786ea0cd"
  },
  "responseShape": {
    "text": "string",
    "raw_transcript": "string",
    "detected_languages": [
      "string"
    ]
  },
  "responseSample": {
    "text": "Tôi muốn book 2 vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.",
    "raw_transcript": "Tôi muốn book 2 vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.",
    "detected_languages": [
      "vi-VN"
    ]
  }
}
```

## Semantic annotation

- Transport: HTTP
- Endpoint: `/v1/annotations`
- Status: 200 OK
- Duration: 301 ms
- Note: Documented correction and semantic-tag endpoint proposed for Phase 02.

```json
{
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-credits-used": "0.1",
    "x-request-id": "019f75cd-cd61-7d23-95f2-2cfef0994038"
  },
  "responseShape": {
    "text": "string",
    "raw_text": "string",
    "annotated_text": "string",
    "annotations": []
  },
  "responseSample": {
    "text": "Tôi muốn book hai vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.",
    "raw_text": "Tôi muốn book hai vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.",
    "annotated_text": "Tôi muốn book hai vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.",
    "annotations": []
  }
}
```

## Brief path: ASR transcribe

- Transport: HTTP
- Endpoint: `/v1/asr/transcribe`
- Status: 404 Not Found
- Duration: 123 ms
- Note: Path appears in the challenge brief but not in the public API reference.

```json
{
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "x-request-id": "019f75cd-ce0f-793a-994f-08f48e544d32"
  },
  "responseShape": "string",
  "responseSample": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /v1/asr/transcribe</pre>\n</body>\n</html>\n"
}
```

## Brief path: understand

- Transport: HTTP
- Endpoint: `/v1/understand`
- Status: 404 Not Found
- Duration: 64 ms
- Note: Path appears in the challenge brief but not in the public API reference.

```json
{
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "x-request-id": "019f75cd-ce8c-7838-8fa0-fcabd25da8c1"
  },
  "responseShape": "string",
  "responseSample": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /v1/understand</pre>\n</body>\n</html>\n"
}
```

## Realtime auto-detect

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: session.ready
- Duration: 559 ms

```json
{
  "responseShape": [
    {
      "type": "string",
      "sessionId": "string",
      "supportedModels": [
        "string"
      ],
      "rateLimitBypass": "boolean",
      "supportedLanguages": [
        "string"
      ],
      "timestamp": "number"
    }
  ],
  "responseSample": [
    {
      "type": "session.created",
      "sessionId": "rtt_1784387850083_5msx8y",
      "supportedModels": [
        "valsea-rtt"
      ],
      "rateLimitBypass": false,
      "supportedLanguages": [
        "arabic",
        "arabic-algeria",
        "arabic-bahrain",
        "arabic-egypt",
        "arabic-israel",
        "arabic-jordan",
        "arabic-kuwait",
        "arabic-lebanon"
      ],
      "timestamp": 1784387850083
    },
    {
      "type": "session.ready",
      "sessionId": "rtt_1784387850083_5msx8y",
      "engine": "valsea-4",
      "timestamp": 1784387850412
    }
  ]
}
```

## Realtime Vietnamese

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: session.ready
- Duration: 658 ms

```json
{
  "responseShape": [
    {
      "type": "string",
      "sessionId": "string",
      "supportedModels": [
        "string"
      ],
      "rateLimitBypass": "boolean",
      "supportedLanguages": [
        "string"
      ],
      "timestamp": "number"
    }
  ],
  "responseSample": [
    {
      "type": "session.created",
      "sessionId": "rtt_1784387850863_opdv61",
      "supportedModels": [
        "valsea-rtt"
      ],
      "rateLimitBypass": false,
      "supportedLanguages": [
        "arabic",
        "arabic-algeria",
        "arabic-bahrain",
        "arabic-egypt",
        "arabic-israel",
        "arabic-jordan",
        "arabic-kuwait",
        "arabic-lebanon"
      ],
      "timestamp": 1784387850864
    },
    {
      "type": "session.ready",
      "sessionId": "rtt_1784387850863_opdv61",
      "engine": "valsea-4",
      "timestamp": 1784387851077
    }
  ]
}
```

## Realtime language-array negative probe

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: error: INVALID_MESSAGE
- Duration: 270 ms

```json
{
  "responseShape": [
    {
      "type": "string",
      "sessionId": "string",
      "supportedModels": [
        "string"
      ],
      "rateLimitBypass": "boolean",
      "supportedLanguages": [
        "string"
      ],
      "timestamp": "number"
    }
  ],
  "responseSample": [
    {
      "type": "session.created",
      "sessionId": "rtt_1784387851286_vxqt2f",
      "supportedModels": [
        "valsea-rtt"
      ],
      "rateLimitBypass": false,
      "supportedLanguages": [
        "arabic",
        "arabic-algeria",
        "arabic-bahrain",
        "arabic-egypt",
        "arabic-israel",
        "arabic-jordan",
        "arabic-kuwait",
        "arabic-lebanon"
      ],
      "timestamp": 1784387851286
    },
    {
      "type": "error",
      "code": "INVALID_MESSAGE",
      "message": "Failed to parse message",
      "timestamp": 1784387851347
    }
  ]
}
```
