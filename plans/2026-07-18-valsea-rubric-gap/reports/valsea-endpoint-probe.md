# VALSEA endpoint probe

- Timestamp (UTC): 2026-07-18T14:13:23.106Z
- Audio fixture: `valsea-probe-16k.wav` (synthetic Vietnamese speech; no customer PII)
- Authentication: Bearer/query credential loaded from local `.env`; value never written to this report
- Public docs checked:
  - https://valsea.ai/docs/api/transcribe
  - https://valsea.ai/docs/api/annotate
  - https://valsea.ai/docs/realtime

## Summary

| Probe | Endpoint | Status | Latency | Decision |
|---|---|---:|---:|---|
| Batch transcription | `/v1/audio/transcriptions` | 200 OK | 7289 ms | Dùng được |
| Semantic annotation | `/v1/annotations` | 200 OK | 202 ms | Dùng được |
| Brief path: ASR transcribe | `/v1/asr/transcribe` | 404 Not Found | 335 ms | Không xác nhận |
| Brief path: understand | `/v1/understand` | 404 Not Found | 68 ms | Không xác nhận |
| Realtime auto-detect | `/v1/realtime` | session.ready | 397 ms | Dùng được |
| Realtime Vietnamese | `/v1/realtime` | session.ready | 458 ms | Dùng được |
| Realtime language-array negative probe | `/v1/realtime` | error: INVALID_MESSAGE | 277 ms | Không xác nhận |

## Implementation decisions

- Batch ASR: `200 OK` in 7289 ms for a 4.78-second fixture. Use only for uploaded
  audio in `/engine`; keep realtime calls on WebSocket.
- Annotation: `200 OK` in 202 ms. Parse correction/tag fields as optional because
  this valid booking sample returned an empty `annotations` array; never treat a
  tag as validated booking data.
- Brief-only REST paths: both returned `404 Not Found`. Do not build adapters
  against `/v1/asr/transcribe` or `/v1/understand`.
- Realtime: auto-detect and Vietnamese both reached `session.ready` on engine
  `valsea-4`; the language-array probe returned `INVALID_MESSAGE`. Simultaneous
  language arrays are not supported by this probe.

## Batch transcription

- Transport: HTTP
- Endpoint: `/v1/audio/transcriptions`
- Status: 200 OK
- Duration: 7289 ms
- Note: Documented OpenAI-compatible batch ASR endpoint.

```json
{
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-credits-used": "1",
    "x-request-id": "019f7592-fad3-7974-9a1f-7011e83b8c2d"
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
- Duration: 202 ms
- Note: Documented correction and semantic-tag endpoint proposed for Phase 02.

```json
{
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-credits-used": "0.1",
    "x-request-id": "019f7593-16d0-7e5e-980e-85b6b39477bf"
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
- Duration: 335 ms
- Note: Path appears in the challenge brief but not in the public API reference.

```json
{
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "x-request-id": "019f7593-1722-7724-88f3-0bbaa0cc179a"
  },
  "responseShape": "string",
  "responseSample": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /v1/asr/transcribe</pre>\n</body>\n</html>\n"
}
```

## Brief path: understand

- Transport: HTTP
- Endpoint: `/v1/understand`
- Status: 404 Not Found
- Duration: 68 ms
- Note: Path appears in the challenge brief but not in the public API reference.

```json
{
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "x-request-id": "019f7593-1873-742b-92e5-4ca28a366f22"
  },
  "responseShape": "string",
  "responseSample": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /v1/understand</pre>\n</body>\n</html>\n"
}
```

## Realtime auto-detect

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: session.ready
- Duration: 397 ms

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
      "sessionId": "rtt_1784384002234_m5my4p",
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
      "timestamp": 1784384002234
    },
    {
      "type": "session.ready",
      "sessionId": "rtt_1784384002234_m5my4p",
      "engine": "valsea-4",
      "timestamp": 1784384002552
    }
  ]
}
```

## Realtime Vietnamese

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: session.ready
- Duration: 458 ms

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
      "sessionId": "rtt_1784384002750_na7qe1",
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
      "timestamp": 1784384002751
    },
    {
      "type": "session.ready",
      "sessionId": "rtt_1784384002750_na7qe1",
      "engine": "valsea-4",
      "timestamp": 1784384003023
    }
  ]
}
```

## Realtime language-array negative probe

- Transport: WebSocket
- Endpoint: `/v1/realtime`
- Status: error: INVALID_MESSAGE
- Duration: 277 ms

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
      "sessionId": "rtt_1784384003228_pvkzou",
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
      "timestamp": 1784384003228
    },
    {
      "type": "error",
      "code": "INVALID_MESSAGE",
      "message": "Failed to parse message",
      "timestamp": 1784384003292
    }
  ]
}
```
