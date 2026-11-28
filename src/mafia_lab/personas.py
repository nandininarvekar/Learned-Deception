"""Opponent personalities. Two fixed pools: the learning agent trains against one and is tested
against the other (H3). Assigned per game from the seed, so no name keeps a personality and every
experimental condition faces the same sequence of opponents."""
import random

POOLS = {
    "training": {
        "cautious": "You are cautious: you rarely accuse without concrete evidence and prefer to wait for more information.",
        "trusting": "You tend to go along with confident players and often support the accusation with the most backing.",
        "talkative": "You are talkative: you share your reasoning at length and react to almost every message.",
    },
    "heldout": {
        "skeptical": "You are skeptical: you check every claim against votes and earlier statements before believing it.",
        "accuser": "You are an aggressive accuser: you pick a suspect early and push hard for a vote.",
        "quiet": "You are quiet: you speak rarely and briefly, and mostly watch how others vote.",
    },
}
NAIVE = "You are naive: you tend to believe what other players tell you, especially confident claims."


def assign(players, exclude, pool, seed, naive=False, roles=None):
    """Map each non-excluded player to (persona name, instruction). Seeded and independent of the
    role shuffle, so adding personas never changes who gets which role."""
    if pool == "off" and not naive:
        return {}
    rng = random.Random(f"{seed}:personas:{pool}")
    eligible = [p for p in players if p not in exclude]
    out = {}
    if pool != "off":
        names = list(POOLS[pool])
        for i, p in enumerate(rng.sample(eligible, len(eligible))):
            name = names[i % len(names)]
            out[p] = (name, POOLS[pool][name])
    if naive and roles:
        villagers = [p for p in eligible if roles[p] == "villager"]
        if villagers:
            p = rng.choice(villagers)
            out[p] = ("naive", NAIVE)
    return out
