from pydantic import BaseModel, Field

class ConstellationNode(BaseModel):
    id: str
    name: str
    description: str
    current_rank: int = 0
    max_rank: int = 10
    cost_base: int = 1
    cost_multiplier: float = 1.8
    effect_per_rank: float = 0.20  # e.g. +20% damage per rank

    def get_cost_for_next_rank(self) -> int:
        return int(self.cost_base * (self.cost_multiplier ** self.current_rank))

class AscensionTree(BaseModel):
    sparks: int = 0
    total_sparks_earned: int = 0
    times_ascended: int = 0
    nodes: dict[str, ConstellationNode] = Field(default_factory=dict)

    @classmethod
    def default_tree(cls) -> "AscensionTree":
        nodes = {
            "cosmic_might": ConstellationNode(
                id="cosmic_might",
                name="Cosmic Might",
                description="+25% Permanent All Damage per rank",
                current_rank=0,
                max_rank=20,
                cost_base=1,
                cost_multiplier=1.6,
                effect_per_rank=0.25
            ),
            "elemental_apotheosis": ConstellationNode(
                id="elemental_apotheosis",
                name="Elemental Apotheosis",
                description="+20% Fire, Ice, Lightning, & Void Damage per rank",
                current_rank=0,
                max_rank=20,
                cost_base=2,
                cost_multiplier=1.7,
                effect_per_rank=0.20
            ),
            "spire_stride": ConstellationNode(
                id="spire_stride",
                name="Spire Stride",
                description="Start subsequent runs skipping +5 floors per rank (capped at 40% highest floor)",
                current_rank=0,
                max_rank=10,
                cost_base=3,
                cost_multiplier=2.0,
                effect_per_rank=5.0
            ),
            "overdrive_resonance": ConstellationNode(
                id="overdrive_resonance",
                name="Overdrive Resonance",
                description="+40% Minigame frenzy potency and duration per rank",
                current_rank=0,
                max_rank=15,
                cost_base=2,
                cost_multiplier=1.75,
                effect_per_rank=0.40
            ),
            "chronos_slumber": ConstellationNode(
                id="chronos_slumber",
                name="Chronos Slumber",
                description="+20% Offline idle progression reward efficiency per rank",
                current_rank=0,
                max_rank=10,
                cost_base=2,
                cost_multiplier=1.8,
                effect_per_rank=0.20
            ),
            "aether_fortune": ConstellationNode(
                id="aether_fortune",
                name="Aether Fortune",
                description="+15% Gear drop chance and higher rarity floor per rank",
                current_rank=0,
                max_rank=15,
                cost_base=3,
                cost_multiplier=1.9,
                effect_per_rank=0.15
            )
        }
        return cls(nodes=nodes)
