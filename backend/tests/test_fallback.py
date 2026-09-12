import json

import pytest

from app import llm
from app.llm import AllModelsFailed, invoke_with_fallback


class FakeResponse:
    def __init__(self, content):
        self.content = content


class FakeModel:
    """Stands in for a ChatOpenAI bound to one model id."""

    def __init__(self, behaviour):
        self.behaviour = behaviour

    def invoke(self, messages):
        if isinstance(self.behaviour, Exception):
            raise self.behaviour
        return FakeResponse(self.behaviour)


@pytest.fixture
def chain(monkeypatch):
    """Install a fake 3-model chain and let each test dictate each model's behaviour.

    Rotation is pinned to the head so these tests exercise fallback order alone;
    rotation has its own tests below.
    """
    behaviours = {}
    monkeypatch.setattr(
        type(llm.settings), "model_chain", property(lambda self: ["m1", "m2", "m3"])
    )
    monkeypatch.setattr(llm, "_build_one", lambda model, temp: FakeModel(behaviours[model]))
    monkeypatch.setattr(llm, "_rotated_chain", lambda: ["m1", "m2", "m3"])
    return behaviours


def test_first_model_wins(chain):
    chain.update({"m1": "hello", "m2": "unused", "m3": "unused"})
    result, model = invoke_with_fallback([])
    assert (result, model) == ("hello", "m1")


def test_falls_through_to_second_model_on_exception(chain):
    chain.update({"m1": RuntimeError("429 rate limited"), "m2": "second", "m3": "unused"})
    result, model = invoke_with_fallback([])
    assert (result, model) == ("second", "m2")


def test_skips_empty_response(chain):
    chain.update({"m1": "   ", "m2": "real answer", "m3": "unused"})
    _, model = invoke_with_fallback([])
    assert model == "m2"


def test_skips_model_whose_output_fails_to_parse(chain):
    chain.update({"m1": "not json at all", "m2": '{"ok": true}', "m3": "unused"})
    result, model = invoke_with_fallback([], parse=json.loads)
    assert (result, model) == ({"ok": True}, "m2")


def test_raises_when_every_model_fails(chain):
    chain.update({m: RuntimeError(f"{m} down") for m in ["m1", "m2", "m3"]})
    with pytest.raises(AllModelsFailed) as exc:
        invoke_with_fallback([])
    # The error names each model so a total outage is diagnosable.
    assert "m1" in str(exc.value) and "m3" in str(exc.value)


def test_quota_error_stops_the_chain_immediately(chain, monkeypatch):
    """The account-wide cap means no model can serve, so don't try the rest."""
    quota = RuntimeError(
        "Error code: 429 - {'error': {'message': 'Rate limit exceeded: "
        "free-models-per-day. Add 10 credits to unlock 1000 free model requests'}}"
    )
    tried = []

    def spy(model, temp):
        tried.append(model)
        return FakeModel(chain[model])

    chain.update({"m1": quota, "m2": "would have worked", "m3": "unused"})
    monkeypatch.setattr(llm, "_build_one", spy)

    with pytest.raises(llm.QuotaExhausted):
        invoke_with_fallback([])

    assert tried == ["m1"], "chain should stop at the first quota refusal"


def test_per_model_429_still_falls_through(chain):
    """A model's own throttling is not the account cap — keep going."""
    chain.update({
        "m1": RuntimeError("Error code: 429 - rate limit exceeded for this model"),
        "m2": "second",
        "m3": "unused",
    })
    _, model = invoke_with_fallback([])
    assert model == "m2"


def test_rotation_advances_each_call(monkeypatch):
    from itertools import count

    monkeypatch.setattr(
        type(llm.settings), "model_chain", property(lambda self: ["a", "b", "c"])
    )
    monkeypatch.setattr(llm, "_calls", count())

    assert llm._rotated_chain() == ["a", "b", "c"]
    assert llm._rotated_chain() == ["b", "c", "a"]
    assert llm._rotated_chain() == ["c", "a", "b"]
    # Wraps back to the head, so every model stays reachable as a fallback.
    assert llm._rotated_chain() == ["a", "b", "c"]


def test_rotation_noop_for_single_model(monkeypatch):
    monkeypatch.setattr(type(llm.settings), "model_chain", property(lambda self: ["only"]))
    assert llm._rotated_chain() == ["only"]
