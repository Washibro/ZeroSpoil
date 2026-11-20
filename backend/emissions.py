from typing import Dict, List

# Official UN FAOSTAT Food Wastage Footprint GHG multipliers (kg CO2e per kg food saved)
FAOSTAT_FACTORS: Dict[str, float] = {
    "Dairy": 3.2,
    "Vegetables": 1.4,
    "Fruits": 0.8,
    "Poultry": 4.5,
    "Fish": 3.8,
    "Eggs": 2.7,
}


def get_emission_factor(category: str) -> float:
    return FAOSTAT_FACTORS.get(category, 2.0)


def calculate_co2e_kg(category: str, quantity_kg: float) -> float:
    return round(quantity_kg * get_emission_factor(category), 3)


def build_emissions_summary(category_savings_kg: Dict[str, float]) -> Dict:
    breakdown: List[Dict] = []
    total_saved_kg = 0.0
    total_co2e_kg = 0.0

    for category, saved_kg in category_savings_kg.items():
        factor = get_emission_factor(category)
        co2e_kg = round(saved_kg * factor, 2)
        total_saved_kg += saved_kg
        total_co2e_kg += co2e_kg
        breakdown.append(
            {
                "category": category,
                "food_saved_kg": round(saved_kg, 2),
                "faostat_factor_kg_co2e_per_kg": factor,
                "co2e_avoided_kg": co2e_kg,
                "co2e_avoided_tonnes": round(co2e_kg / 1000.0, 4),
            }
        )

    return {
        "standard": "UN FAOSTAT Food Wastage Footprint (SDG 12.3 Aligned)",
        "total_food_saved_kg": round(total_saved_kg, 2),
        "total_co2e_avoided_kg": round(total_co2e_kg, 2),
        "total_co2e_avoided_tonnes": round(total_co2e_kg / 1000.0, 2),
        "factors": FAOSTAT_FACTORS,
        "category_breakdown": breakdown,
    }