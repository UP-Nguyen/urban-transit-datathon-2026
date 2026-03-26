# Urban Transit Datathon 2026

# Why Does Urban Rail Cost So Much?

An interactive map-story exploring how urban rail construction costs vary across 884 projects in 59 countries.



- index.html - page structure
- styles.css - styling
- script.js - front-end interactivity
- data/projects.json - processed data used by the site
- data/Merged-Costs-1-4.csv - original raw CSV
- scripts/preprocess_costs.py - Python script that regenerates projects.json from the CSV

# on local

(bash)
cd urban-transit-datathon-2026
python -m http.server 8000


 open http://localhost:8000/ on browswer

## Rebuild processed data

bash
python scripts/preprocess_costs.py


That will read data/Merged-Costs-1-4.csv and overwrite data/projects.json.



## Project overview

This project visualizes the **Construction Costs of Urban Rail Projects Worldwide** dataset for the NYU Data Services data visualization competition. (https://ultraviolet.library.nyu.edu/records/9wnjp-kez15)

In this project, we ask:

**Why do some urban rail projects cost so much more per kilometer than others?**

The site combines a world map, project-level drilldowns, and curated featured examples to show that rail costs are shaped by a mix of **alignment type**, **project complexity**, and **local context**. Tunnel-heavy projects tend to cost more due to the immense technical challenges of underground construction, specifically utilizing tunnel boring machines (TBMs) through complex geology, high labor costs, and significant, specialized safety infrastructure like ventilation and emergency exits. However, this alone doesn't account for the high costs. 

## Live interaction design

The visualization is designed around three levels of exploration:

1. **Global pattern**  
   A map colors countries by a selected summary metric, such as median cost per kilometer.

2. **Country drilldown**  
   Clicking a country updates a side panel showing:
   - number of projects
   - cities represented
   - median cost/km
   - total project length in the dataset
   - project cards for that country

3. **Featured projects and comparators**  
   A curated set of standout projects provides context for well-known high-cost outliers and lower-cost comparators.

## Research question

This project investigates three related questions:

- How do rail construction costs compare across countries?
- What kinds of projects tend to be more expensive?
- How can curated examples help explain the difference between extreme outliers and more moderate-cost projects?

## Data source

This project uses the competition dataset:

**Construction Costs of Urban Rail Projects Worldwide**

Source:
- NYU Data Services competition dataset
- Transit Costs Project / merged CSV used in this submission

Primary working file:
- `data/Merged-Costs-1-4.csv`

Processed output used by the site:
- `data/projects.json`

## Key variables used

The visualization relies primarily on these variables from the dataset:

- `Country`
- `City`
- `Line`
- `Phase`
- `Start_year`
- `End_year`
- `Length`
- `Stations`
- `Tunnel`
- `Elevated`
- `Atgrade`
- `Cost_km_2023_dollars`

## Derived fields

Several fields are derived during preprocessing:

### `project_name`
A display-friendly project name assembled from city, line, and phase fields.

### `country_code`
Two-letter country code used for map joins.

### `country_name`
Human-readable country name used in the interface.

### `dominant_alignment`
Derived from whichever of `Tunnel`, `Elevated`, or `Atgrade` is largest for a project.

Possible values:
- `Tunnel`
- `Elevated`
- `At-grade`
- `Unknown`

### Country-level summary metrics
Computed from project-level observations for each country:
- project count
- cities represented
- median cost/km
- average cost/km
- highest cost/km
- total project length in dataset

## Methods

### Data cleaning
The raw merged CSV was cleaned in Python before being used in the web app.

Processing steps included:
- standardizing numeric fields
- coercing missing values
- generating a readable project title
- deriving dominant alignment
- selecting only fields needed by the front end
- exporting a lighter-weight JSON file for faster loading in the browser

### Country summaries
The choropleth does **not** represent national infrastructure budgets or total national spending.  
Instead, each country color summarizes the **projects from that country present in this dataset**.

For example, when the map is set to **Median cost/km**, a country’s color reflects the median `Cost_km_2023_dollars` across the projects included for that country in the dataset.

### Featured projects
The featured project panel is intentionally curated. It includes:
- well-known high-cost outliers
- at least one lower-cost comparator

These were added to help viewers interpret the broader patterns visible in the map and project list.

## Design rationale

This project was designed to balance **accessibility**, **exploration**, and **interpretation**.

### Why a world choropleth map?
A country-level map gives viewers an immediate global overview and invites exploration. It provides a strong entry point, even for users unfamiliar with transport planning datasets, and users can sense at first glance, intuitively, which countries might be trying to invest more in public transit.

### Why a country drilldown panel?
Because the dataset is project-level, not national-budget-level, users need to be able to inspect the projects behind each country summary. The side panel makes those summaries more transparent.

### Why featured projects?
While processing the data, I found a few outliers that stuck out to me that I wanted to highlight. The panel features outliers such as East Side Access and Second Avenue Subway while contrasting them with lower-cost examples from other contexts.

### Why pills and compact project cards?
Project cards use compact visual tags to quickly communicate:
- dominant alignment
- project length
- station count
- cost per kilometer

This allows users to compare projects efficiently without opening a separate detail page.

## Main takeaways

A few patterns stand out in the current version of the visualization:

- Tunnel-heavy projects often cost more per kilometer than elevated or at-grade projects.
- Short, highly complex projects can become extreme outliers.
- Some countries appear to build many projects at much lower unit costs than others.
- Cost variation is shaped by delivery timeline, engineering choices, project scale, and local delivery context, not by geography alone.

## Limitations

This project is intended as a comparative visualization, not a definitive accounting system.

Important limitations include:

### 1. Country shading is a summary of project observations
The map colors do **not** represent total national transit spending.

### 2. Countries are unevenly represented
Some countries have many more projects in the dataset than others, which affects the stability of summary statistics.

### 3. Cost/km is useful but incomplete
Cost per kilometer is a strong comparative metric, but it does not fully capture:
- scope differences
- station complexity
- geology
- procurement model
- labor and regulation context
- whether supporting infrastructure is bundled into project cost

### 4. Dominant alignment simplifies mixed projects
A project may include tunnel, elevated, and at-grade segments, but this visualization reduces that mix to a single dominant category for readability.

### 5. Project definitions may vary
The way projects are grouped, phased, or reported may differ across countries and sources.

