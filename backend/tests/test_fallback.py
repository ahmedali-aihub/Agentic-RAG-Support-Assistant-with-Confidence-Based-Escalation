import json
from itertools import count

import pytest

from app import llm
from app.llm import AllModelsFailed, Candidate, QuotaExhausted, invoke_with_fallback

QUOTA_429 = (
    "Error code: 429 - {'error': {'message': 'Rate limit exceeded: "
    "free-models-per-day. Add 10 credits to unlock 1000 free model requests'}}"
)
GEMINI_QUOTA = "429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'Requests'"


class FakeResponse:
    def __init__(self, content):
        self.content = content


class FakeModel:
    def __init__(self, behaviour):
        self.behaviour = behaviour

    def invoke(self, messages):
        if isinstance(self.behaviour, Exception):
            raise self.behaviour
        return FakeResponse(self.behaviour)


def candidate(provider: str, model: str, key_index: int = 1) -> Candidate:
    return Candidate(provider, model, f"key{key_index}", "http://x", key_index)


@pytest.fixture
def chain(monkeypatch):
    """Install a fake candidate list keyed by label, with rotation pinned off."""
    behaviours: dict[str, object] = {}
    cands = [candidate("openrouter", "m1"), candidate("openrouter", "m2"), candidate("openrouter", "m3")]

    monkeypatch.setattr(llm, "build_candidates", lambda: cands)
    monkeypatch.setattr(llm, "_rotate", lambda items: items)
    monkeypatch.setattr(
        llm, "_client", lambda provider, model, key, base, temp: FakeModel(behaviours[model])
    )
    return behaviours


def test_first_candidate_wins(chain):
    chain.update({"m1": "hello", "m2": "unused", "m3": "unused"})
    result, label = invoke_with_fallback([])
    assert result == "hello"
    assert label == "openrouter[1]/m1"


def test_falls_through_on_exception(chain):
    chain.update({"m1": RuntimeError("503 down"), "m2": "second", "m3": "unused"})
    _, label = invoke_with_fallback([])
    assert label == "openrouter[1]/m2"


def test_skips_empty_response(chain):
    chain.update({"m1": "   ", "m2": "real", "m3": "unused"})
    _, label = invoke_with_fallback([])
    assert label == "openrouter[1]/m2"


def test_skips_unparseable_output(chain):
    chain.update({"m1": "not json", "m2": '{"ok": true}', "m3": "unused"})
    result, label = invoke_with_fallback([], parse=json.loads)
    assert result == {"ok": True}
    assert label == "openrouter[1]/m2"


def test_raises_when_all_fail(chain):
    chain.update({m: RuntimeError(f"{m} down") for m in ["m1", "m2", "m3"]})
    with pytest.raises(AllModelsFailed) as exc:
        invoke_with_fallback([])
    assert "m1" in str(exc.value) and "m3" in str(exc.value)


def test_no_keys_configured_says_so(monkeypatch):
    monkeypatch.setattr(llm, "build_candidates", list)
    with pytest.raises(AllModelsFailed, match="No API keys configured"):
        invoke_with_fallback([])


def test_spent_key_retires_only_that_account(monkeypatch):
    """A spent quota must not abandon accounts that still have budget."""
    cands = [
        candidate("openrouter", "m1", 1),
        candidate("openrouter", "m2", 1),
        candidate("openrouter", "m1", 2),
    ]
    tried: list[str] = []

    def client(provider, model, key, base, temp):
        tried.append(f"{key}/{model}")
        # Only the first account is out of budget.
        return FakeModel(RuntimeError(QUOTA_429) if key == "key1" else "from second account")

    monkeypatch.setattr(llm, "build_candidates", lambda: cands)
    monkeypatch.setattr(llm, "_rotate", lambda items: items)
    monkeypatch.setattr(llm, "_client", client)

    result, label = invoke_with_fallback([])
    assert result == "from second account"
    assert label == "openrouter[2]/m1"
    # key1's second model is skipped: same account, same spent budget.
    assert tried == ["key1/m1", "key2/m1"]


def test_gemini_quota_recognised(monkeypatch):
    """Gemini words its quota refusal differently, but it means the same thing."""
    cands = [candidate("gemini", "g1", 1), candidate("gemini", "g2", 1)]
    tried: list[str] = []

    def client(provider, model, key, base, temp):
        tried.append(model)
        return FakeModel(RuntimeError(GEMINI_QUOTA))

    monkeypatch.setattr(llm, "build_candidates", lambda: cands)
    monkeypatch.setattr(llm, "_rotate", lambda items: items)
    monkeypatch.setattr(llm, "_client", client)

    with pytest.raises(QuotaExhausted):
        invoke_with_fallback([])
    assert tried == ["g1"], "second model on a spent key should be skipped"


def test_falls_over_to_gemini_when_openrouter_is_spent(monkeypatch):
    cands = [candidate("openrouter", "m1", 1), candidate("gemini", "g1", 1)]

    def client(provider, model, key, base, temp):
        return FakeModel(RuntimeError(QUOTA_429) if provider == "openrouter" else "gemini answer")

    monkeypatch.setattr(llm, "build_candidates", lambda: cands)
    monkeypatch.setattr(llm, "_rotate", lambda items: items)
    monkeypatch.setattr(llm, "_client", client)

    result, label = invoke_with_fallback([])
    assert (result, label) == ("gemini answer", "gemini[1]/g1")


def test_quota_exhausted_only_when_every_account_is_spent(monkeypatch):
    cands = [candidate("openrouter", "m1", 1), candidate("gemini", "g1", 1)]
    monkeypatch.setattr(llm, "build_candidates", lambda: cands)
    monkeypatch.setattr(llm, "_rotate", lambda items: items)
    monkeypatch.setattr(
        llm, "_client", lambda *a: FakeModel(RuntimeError(QUOTA_429))
    )

    with pytest.raises(QuotaExhausted, match="Every configured account"):
        invoke_with_fallback([])


def test_rotation_advances_and_wraps(monkeypatch):
    items = [candidate("openrouter", m) for m in ("a", "b", "c")]
    monkeypatch.setattr(llm, "_calls", count())

    assert [c.model for c in llm._rotate(items)] == ["a", "b", "c"]
    assert [c.model for c in llm._rotate(items)] == ["b", "c", "a"]
    assert [c.model for c in llm._rotate(items)] == ["c", "a", "b"]
    assert [c.model for c in llm._rotate(items)] == ["a", "b", "c"]


def test_labels_never_leak_the_key():
    c = candidate("openrouter", "m1", 2)
    assert "key2" not in c.label
    assert c.label == "openrouter[2]/m1"


def test_build_candidates_pairs_every_key_with_every_model(monkeypatch):
    monkeypatch.setattr(type(llm.settings), "openrouter_keys", property(lambda s: ["k1", "k2"]))
    monkeypatch.setattr(type(llm.settings), "gemini_keys", property(lambda s: ["g1"]))
    monkeypatch.setattr(type(llm.settings), "model_chain", property(lambda s: ["a", "b"]))
    monkeypatch.setattr(type(llm.settings), "gemini_model_chain", property(lambda s: ["z"]))

    cands = llm.build_candidates()
    assert len(cands) == 2 * 2 + 1
    # OpenRouter is spent before the scarcer Gemini allowance is touched.
    assert [c.provider for c in cands] == ["openrouter"] * 4 + ["gemini"]
