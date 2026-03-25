# Urban Transit Datathon 2026



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
