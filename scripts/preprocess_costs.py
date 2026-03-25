from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


COUNTRY_NAME_MAP = {
  "CN": "China",
  "IN": "India",
  "IT": "Italy",
  "TR": "Turkey",
  "DE": "Germany",
  "US": "United States",
  "KR": "South Korea",
  "FR": "France",
  "TW": "Taiwan",
  "CA": "Canada",
  "JP": "Japan",
  "ES": "Spain",
  "HK": "Hong Kong",
  "SA": "Saudi Arabia",
  "TH": "Thailand",
  "BG": "Bulgaria",
  "BR": "Brazil",
  "SE": "Sweden",
  "EG": "Egypt",
  "PL": "Poland",
  "RU": "Russia",
  "VN": "Vietnam",
  "AT": "Austria",
  "AU": "Australia",
  "GR": "Greece",
  "PH": "Philippines",
  "SG": "Singapore",
  "AE": "United Arab Emirates",
  "BD": "Bangladesh",
  "CH": "Switzerland",
  "CZ": "Czech Republic",
  "FI": "Finland",
  "IR": "Iran",
  "PA": "Panama",
  "UA": "Ukraine",
  "UK": "United Kingdom",
  "BH": "Bahrain",
  "CL": "Chile",
  "DR": "Dominican Republic",
  "IL": "Israel",
  "MX": "Mexico",
  "MY": "Malaysia",
  "NO": "Norway",
  "PT": "Portugal",
  "RO": "Romania",
  "RS": "Serbia",
  "UZ": "Uzbekistan",
  "AR": "Argentina",
  "BE": "Belgium",
  "DK": "Denmark",
  "EC": "Ecuador",
  "HU": "Hungary",
  "ID": "Indonesia",
  "KW": "Kuwait",
  "NL": "Netherlands",
  "NZ": "New Zealand",
  "PE": "Peru",
  "PK": "Pakistan",
  "QA": "Qatar"
}


def dominant_alignment(row: pd.Series) -> str:
    values = {
        "Tunnel": float(row.get("Tunnel", 0) or 0),
        "Elevated": float(row.get("Elevated", 0) or 0),
        "At grade": float(row.get("Atgrade", 0) or 0),
    }
    return max(values, key=values.get)


def build_project_name(city: str, line: str | None, phase: str | None) -> str:
    parts = [str(city).strip()]
    if pd.notna(line) and str(line).strip():
        parts.append(str(line).strip())
    if pd.notna(phase) and str(phase).strip():
        parts.append(str(phase).strip())
    return " — ".join(parts)


def clean_number(value):
    if pd.isna(value):
        return None
    return float(value)


def load_projects(csv_path: Path) -> list[dict]:
    df = pd.read_csv(csv_path)

    projects = []
    for _, row in df.iterrows():
        country_code = str(row["Country"]).strip()
        city = str(row["City"]).strip()
        line = row.get("Line")
        phase = row.get("Phase")
        length_km = clean_number(row.get("Length")) or 0.0
        stations = int(row["Stations"]) if pd.notna(row.get("Stations")) else 0
        tunnel_km = clean_number(row.get("Tunnel")) or 0.0
        elevated_km = clean_number(row.get("Elevated")) or 0.0
        atgrade_km = clean_number(row.get("Atgrade")) or 0.0

        project = {
            "country_code": country_code,
            "country_name": COUNTRY_NAME_MAP.get(country_code, country_code),
            "city": city,
            "project_name": build_project_name(city, line, phase),
            "line": None if pd.isna(line) else str(line),
            "phase": None if pd.isna(phase) else str(phase),
            "start_year": None if pd.isna(row.get("Start_year")) else int(row["Start_year"]),
            "end_year": None if pd.isna(row.get("End_year")) else int(row["End_year"]),
            "length_km": round(length_km, 2),
            "stations": stations,
            "cost_per_km": round(float(row["Cost_km_2023_dollars"]), 2),
            "real_cost_2023": round(float(row["Real_cost_2023_dollars"]), 2),
            "tunnel_km": round(tunnel_km, 2),
            "elevated_km": round(elevated_km, 2),
            "atgrade_km": round(atgrade_km, 2),
            "dominant_alignment": dominant_alignment(row),
            "stations_per_km": round(stations / length_km, 2) if length_km else None,
        }
        projects.append(project)

    return projects


def summarize_countries(projects: list[dict]) -> list[dict]:
    df = pd.DataFrame(projects)
    rows = []

    for country_code, group in df.groupby("country_code", sort=False):
        total_length = float(group["length_km"].fillna(0).sum())
        tunnel_length = float(group["tunnel_km"].fillna(0).sum())
        rows.append({
            "country_code": country_code,
            "country_name": group["country_name"].iloc[0],
            "projects": int(len(group)),
            "cities": int(group["city"].nunique()),
            "total_length_km": round(total_length, 1),
            "median_cost_per_km": round(float(group["cost_per_km"].median()), 2),
            "avg_cost_per_km": round(float(group["cost_per_km"].mean()), 2),
            "max_cost_per_km": round(float(group["cost_per_km"].max()), 2),
            "tunnel_share": round(tunnel_length / total_length, 3) if total_length else 0,
        })

    rows.sort(key=lambda row: (-row["projects"], row["country_name"]))
    return rows


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "data" / "Merged-Costs-1-4.csv"
    out_path = root / "data" / "projects.json"

    projects = load_projects(csv_path)
    countries = summarize_countries(projects)

    payload = {"countries": countries, "projects": projects}
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_path} with {len(projects)} projects and {len(countries)} countries.")


if __name__ == "__main__":
    main()
