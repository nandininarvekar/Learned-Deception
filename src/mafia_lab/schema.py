from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Action(StrictModel):
    type: Literal["speak", "pass", "vote", "night_kill", "investigate", "no_action"]
    message: ShortText | None = None
    target_id: str | None = None


class Decision(StrictModel):
    action: Action
    strategy_summary: ShortText | None = None


class Impression(StrictModel):
    agent_id: str
    impression: str
    evidence_game_ids: list[str]
    evidence_event_ids: list[str]
    confidence: Literal["low", "medium", "high"]
    alternative_explanation: str


class Memory(StrictModel):
    generalized_memory: str = ""
    opponent_impressions: list[Impression] = Field(default_factory=list)

    def markdown(self):
        lines = ["# Private Mafia Memory", "", "## 1. Generalized Memory",
                 self.generalized_memory, "", "## 2. Opponent Impressions"]
        for item in self.opponent_impressions:
            refs = ", ".join(item.evidence_game_ids + item.evidence_event_ids)
            lines.append(f"- **{item.agent_id}** ({item.confidence}): {item.impression} "
                         f"Evidence: {refs}. Alternative: {item.alternative_explanation}")
        return "\n".join(lines) + "\n"


class Start(StrictModel):
    seed: int = 7
    players: Literal[4, 6] = 6
    learning: Literal["off", "one_mafia", "all"] = "all"
    provider: Literal["mock", "openrouter", "codex"] = "mock"
    showcase: bool = True
    delay: float = Field(default=0.3, ge=0, le=5)
    max_days: int = Field(default=5, ge=1, le=10)
    series: str = Field(default="demo", pattern=r"^[a-zA-Z0-9_-]{1,48}$")


class Envelope(StrictModel):
    protocol_version: Literal["1.0"] = "1.0"
    type: str
    message_id: str
    reply_to: str | None = None
    game_id: str
    agent_id: str
    timestamp_utc: str
    payload: dict
