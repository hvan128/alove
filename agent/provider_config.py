"""Pure provider selection rules for the Alove LiveKit worker."""

DEFAULT_AGENT_ENGINE = "cascade"
SUPPORTED_AGENT_ENGINES = ("cascade", "gemini-sts")
DEFAULT_STT_PROVIDER = "valsea"
SUPPORTED_STT_PROVIDERS = ("valsea", "speechmatics", "openai")


def resolve_agent_engine(raw_value: str | None) -> str:
    """Return a normalized allowlisted engine, defaulting to cascade."""
    engine = (raw_value or DEFAULT_AGENT_ENGINE).strip().lower()
    if not engine:
        engine = DEFAULT_AGENT_ENGINE
    if engine not in SUPPORTED_AGENT_ENGINES:
        allowed = ", ".join(SUPPORTED_AGENT_ENGINES)
        raise ValueError(
            f"Unsupported AGENT_ENGINE={engine!r}. Expected one of: {allowed}."
        )
    return engine


def resolve_stt_provider(raw_value: str | None) -> str:
    """Return an allowlisted STT provider, defaulting to VALSEA."""
    provider = (raw_value or DEFAULT_STT_PROVIDER).strip().lower()
    if not provider:
        provider = DEFAULT_STT_PROVIDER
    if provider not in SUPPORTED_STT_PROVIDERS:
        allowed = ", ".join(SUPPORTED_STT_PROVIDERS)
        raise ValueError(
            f"Unsupported STT_PROVIDER={provider!r}. Expected one of: {allowed}."
        )
    return provider


def resolve_engine_and_stt(
    raw_engine: str | None, raw_stt_provider: str | None
) -> tuple[str, str]:
    """Resolve engine and its active STT route without validating inactive env."""
    engine = resolve_agent_engine(raw_engine)
    if engine == "gemini-sts":
        return engine, DEFAULT_STT_PROVIDER
    return engine, resolve_stt_provider(raw_stt_provider)


def validate_required_credentials(
    engine: str,
    stt_provider: str,
    *,
    valsea_api_key: str,
    openai_api_key: str,
    gemini_api_key: str,
) -> None:
    """Fail before logging or SDK construction when an active route lacks a key."""
    if engine == "gemini-sts":
        if not gemini_api_key.strip():
            raise ValueError("GEMINI_API_KEY is required when AGENT_ENGINE=gemini-sts")
        return
    if stt_provider == "valsea" and not valsea_api_key.strip():
        raise ValueError("VALSEA_API_KEY is required when STT_PROVIDER=valsea")
    if stt_provider == "openai" and not openai_api_key.strip():
        raise ValueError("OPENAI_API_KEY is required when STT_PROVIDER=openai")


def non_valsea_warning(provider: str) -> str | None:
    """Explain when an explicit A/B route disables the VALSEA-first path."""
    if provider == DEFAULT_STT_PROVIDER:
        return None
    return (
        f"STT_PROVIDER={provider} selected: VALSEA-first ASR evidence is disabled "
        "for this call. Use only for an explicit A/B comparison."
    )
