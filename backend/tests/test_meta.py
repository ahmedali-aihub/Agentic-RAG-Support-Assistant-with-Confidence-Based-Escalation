from app.graph.meta import SELF_DESCRIPTION, answer_self_question, is_self_question


def test_recognises_common_self_questions():
    for q in [
        "tell me about yourself",
        "Tell me about yourself!",
        "who are you",
        "Who are you?",
        "what are you",
        "what can you do",
        "what can you help with",
        "how do you work",
        "are you a bot",
        "are you an ai",
        "introduce yourself",
        "what is this chatbot",
    ]:
        assert is_self_question(q), f"should recognise: {q!r}"


def test_does_not_misfire_on_real_documentation_questions():
    for q in [
        "How do I issue a partial refund?",
        "What test card simulates a successful payment?",
        "Why did my payout pay_9f8e7d fail last night?",
        "How do I set up webhooks for my account?",
        "What can you tell me about Stripe Connect?",
    ]:
        assert not is_self_question(q), f"should NOT misfire on: {q!r}"


def test_answer_self_question_never_escalates():
    result = answer_self_question({"question": "tell me about yourself"})
    assert result["answer"] == SELF_DESCRIPTION
    assert result["path_taken"] == "answered_self"
    assert result["confidence_score"] == 1.0
    assert result["citations"] == []


def test_answer_self_question_preserves_existing_state():
    result = answer_self_question({"question": "who are you", "attempt": 1})
    assert result["question"] == "who are you"
