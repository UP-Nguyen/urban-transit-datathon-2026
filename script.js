let DATA = null;

async function loadData() {
    const response = await fetch('./data/projects.json');
    if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
    DATA = await response.json();
    initControls();
    renderAll();
}

const state = {
    metric: 'median_cost_per_km',
    sort: 'cost_per_km_desc',
    yearMin: null,
    yearMax: null,
    selectedCountry: null,
    logScale: true,
    hemisphere: 'all',
};

// Constants to add context for some projects
const FEATURED_PROJECT_TARGETS = [
    {
        match: p => p.project_name?.includes('East Side Access'),
        why: 'An outlier: extremely high cost per kilometer for a short, complex tunnel-heavy New York project.'
    },
    {
        match: p => p.project_name?.includes('Second Avenue Phase 1'),
        why: 'One of the best-known high-cost U.S. subway megaprojects, often cited in debates about transit delivery.'
    },
    {
        match: p => p.project_name?.includes('Ontario'),
        why: 'A major current Canadian project that shows how high costs are not limited to New York alone.'
    },
    {
        match: p => p.country_code === 'CN' && (p.cost_per_km != null) && p.cost_per_km < 250 && (p.length_km ?? 0) > 15,
        why: 'A lower-cost implementation from China, showing that long urban rail lines can be delivered at very different unit costs.'
    }
];

const metricLabels = {
    median_cost_per_km: 'Median cost/km',
    avg_cost_per_km: 'Average cost/km',
    projects: 'Project count',
    total_length_km: 'Total length (km)'
};

// To add a new way to view the data
const westernHemisphereCountries = new Set([
    'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'UY', 'PY', 'BO',
    'EC', 'CU', 'DO', 'CR', 'PA', 'GT'
]);

function matchesHemisphere(project) {
    if (state.hemisphere === 'all') return true;
    if (state.hemisphere === 'western') {
        return westernHemisphereCountries.has(project.country_code);
    }
    // All countries not in the western hemisphere are in the eastern hemisphere
    if (state.hemisphere === 'eastern') {
        return !westernHemisphereCountries.has(project.country_code);
    }
    return true;
}

// format money
function fmtMoney(n) {
    if (n == null || Number.isNaN(n)) return '—';
    if (n >= 1000) return '$' + d3fmt(n, 0) + 'M';
    return '$' + d3fmt(n, 0) + 'M';
}

function d3fmt(n, digits = 1) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function matchesYear(project) {
    const y = project.start_year;
    if (state.yearMin != null && y != null && y < state.yearMin) return false;
    if (state.yearMax != null && y != null && y > state.yearMax) return false;
    return true;
}


function projectFilter(project) {
    return matchesYear(project) && matchesHemisphere(project);
}

function filteredProjects() {
    return DATA.projects.filter(projectFilter);
}

function recomputeCountries() {
    const grouped = new Map();
    for (const p of filteredProjects()) {
        if (!grouped.has(p.country_code)) {
            grouped.set(p.country_code, {
                country_code: p.country_code,
                country_name: p.country_name,
                values: [],
                lengths: [],
                projects: 0,
                cities: new Set(),
                total_length_km: 0,
                max_cost_per_km: null,
            });
        }
        const g = grouped.get(p.country_code);
        g.projects += 1;
        if (p.city) g.cities.add(p.city);
        if (p.length_km != null) g.total_length_km += p.length_km;
        if (p.cost_per_km != null) {
            g.values.push(p.cost_per_km);
            g.max_cost_per_km = g.max_cost_per_km == null ? p.cost_per_km : Math.max(g.max_cost_per_km, p.cost_per_km);
        }
    }
    return Array.from(grouped.values()).map(g => {
        const sorted = [...g.values].sort((a, b) => a - b);
        const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
        const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null;
        return {
            country_code: g.country_code,
            country_name: g.country_name,
            projects: g.projects,
            cities: g.cities.size,
            total_length_km: +g.total_length_km.toFixed(1),
            median_cost_per_km: median == null ? null : +median.toFixed(2),
            avg_cost_per_km: avg == null ? null : +avg.toFixed(2),
            max_cost_per_km: g.max_cost_per_km == null ? null : +g.max_cost_per_km.toFixed(2),
        };
    }).sort((a, b) => b.projects - a.projects);
}

function sortProjects(projects) {
    const arr = [...projects];
    const sorter = state.sort;
    arr.sort((a, b) => {
        if (sorter === 'length_desc') return (b.length_km ?? -1) - (a.length_km ?? -1);
        if (sorter === 'year_desc') return (b.start_year ?? -1) - (a.start_year ?? -1);
        if (sorter === 'stations_desc') return (b.stations ?? -1) - (a.stations ?? -1);
        return (b.cost_per_km ?? -1) - (a.cost_per_km ?? -1);
    });
    return arr;
}

function dominantPillClass(alignment) {
    if (alignment === 'Tunnel') return 'tunnel';
    if (alignment === 'Elevated') return 'elevated';
    if (alignment === 'At grade') return 'atgrade';
    return '';
}

function renderHeadlineStats(countryData) {
    const costVals = filteredProjects().map(d => d.cost_per_km).filter(v => v != null).sort((a, b) => a - b);
    const median = costVals.length ? (costVals.length % 2 ? costVals[(costVals.length - 1) / 2] : (costVals[costVals.length / 2 - 1] + costVals[costVals.length / 2]) / 2) : null;
    const maxCost = costVals.length ? costVals[costVals.length - 1] : null;
    const html = [
        { value: d3fmt(countryData.length, 0), label: 'Countries in current view' },
        { value: median == null ? '—' : '$' + d3fmt(median, 0) + 'M/km', label: 'Median cost per kilometer' },
        { value: maxCost == null ? '—' : '$' + d3fmt(maxCost, 0) + 'M/km', label: 'Highest project cost per kilometer' },
    ].map(s => `<div class="stat"><div class="value">${s.value}</div><div class="label">${s.label}</div></div>`).join('');
    document.getElementById('headline-stats').innerHTML = html;
}

function renderMap(countryData) {
    const z = countryData.map(d => d[state.metric]);
    const text = countryData.map(d => {
        const metric = d[state.metric];
        const metricDisplay = state.metric.includes('cost') ? ('$' + d3fmt(metric ?? 0, 0) + 'M') : d3fmt(metric ?? 0, 0);
        return `<b>${d.country_name}</b><br>${metricLabels[state.metric]}: ${metricDisplay}` +
            `<br>Projects: ${d.projects}<br>Cities: ${d.cities}<br>Total length: ${d3fmt(d.total_length_km, 1)} km`;
    });
    const trace = {
        type: 'choropleth',
        locations: countryData.map(d => d.country_name),
        locationmode: 'country names',
        z,
        text,
        hovertemplate: '%{text}<extra></extra>',
        colorscale: state.metric.includes('cost') ? 'YlOrRd' : 'Blues',
        marker: { line: { color: 'rgba(255,255,255,0.7)', width: 0.5 } },
        colorbar: {
            title: state.metric.includes('cost') ? 'USD millions/km' : metricLabels[state.metric],
            thickness: 10
        }
    };
    const layout = {
        margin: { l: 0, r: 0, t: 0, b: 0 },
        geo: {
            projection: { type: 'natural earth' },
            showframe: false,
            showcoastlines: false,
            showocean: true,
            oceancolor: '#cfe8ff',
            showlakes: true,
            lakecolor: '#cfe8ff',
            bgcolor: '#dcebff'
        },
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff'
    };
    Plotly.newPlot('map', [trace], layout, { displayModeBar: false, responsive: true });
    const mapEl = document.getElementById('map');
    mapEl.on('plotly_click', function (e) {
        const countryName = e.points[0].location;
        const country = countryData.find(d => d.country_name === countryName);
        state.selectedCountry = country?.country_code ?? null;
        renderAll();
    });
}

// build the scatter plot
function renderScatter(projects) {
    const groups = [
        { key: 'Tunnel', color: '#1f3c88' },
        { key: 'Elevated', color: '#2a9d8f' },
        { key: 'At grade', color: '#b08968' },
        { key: 'Unknown', color: '#9ca3af' },
    ];
    const traces = groups.map(g => {
        const rows = projects.filter(p => p.dominant_alignment === g.key);
        return {
            type: 'scattergl',
            mode: 'markers',
            name: g.key,
            x: rows.map(r => r.length_km),
            y: rows.map(r => r.cost_per_km),
            text: rows.map(r => `<b>${r.project_name}</b><br>${r.city}, ${r.country_name}<br>Cost/km: $${d3fmt(r.cost_per_km, 0)}M<br>Length: ${d3fmt(r.length_km, 1)} km<br>Stations: ${r.stations ?? '—'}`),
            hovertemplate: '%{text}<extra></extra>',
            marker: {
                color: g.color,
                size: rows.map(r => Math.max(7, Math.min(24, (r.stations ?? 1) + 4))),
                opacity: 0.7,
                line: { width: 0 }
            }
        };
    });
    // check also for log tog
    const layout = {
        margin: { l: 56, r: 18, t: 8, b: 54 },
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        xaxis: { title: 'Project length (km)', gridcolor: '#eef2f7', zeroline: false },
        yaxis: {
            title: 'Cost per km (2023 USD, millions)',
            gridcolor: '#eef2f7',
            zeroline: false,
            type: state.logScale ? 'log' : 'linear'
        },
        legend: { orientation: 'h', x: 0, y: 1.12 }
    };
    Plotly.newPlot('scatter', traces, layout, { displayModeBar: false, responsive: true });
}

// for each selected country, render data 
function renderCountryPanel(countryData) {
    const panel = document.getElementById('country-panel');
    const selectedCode = state.selectedCountry || (countryData[0] && countryData[0].country_code);
    if (!selectedCode) {
        panel.innerHTML = '<h3>No data in the current filter window.</h3>';
        return;
    }
    state.selectedCountry = selectedCode;
    const country = countryData.find(d => d.country_code === selectedCode);
    const projects = sortProjects(filteredProjects().filter(p => p.country_code === selectedCode));
    const metrics = `
    <div class="metric-list">
      <div class="metric"><div class="k">Projects</div><div class="v">${d3fmt(country.projects, 0)}</div></div>
      <div class="metric"><div class="k">Cities represented</div><div class="v">${d3fmt(country.cities, 0)}</div></div>
      <div class="metric"><div class="k">Median cost/km</div><div class="v">${country.median_cost_per_km == null ? '—' : '$' + d3fmt(country.median_cost_per_km, 0) + 'M'}</div></div>
      <div class="metric"><div class="k">Total length in dataset</div><div class="v">${d3fmt(country.total_length_km, 1)} km</div></div>
    </div>`;
    const projectCards = projects.slice(0, 40).map((p, i) => `
    <div class="project ${i === 0 ? 'active' : ''}">
      <div class="title">${p.project_name}</div>
      <div class="meta">${p.city} · ${p.start_year ?? 'year n/a'}${p.end_year ? '–' + p.end_year : ''}</div>
      <div class="pill-row">
        <span class="pill ${dominantPillClass(p.dominant_alignment)}">${p.dominant_alignment}</span>
        <span class="pill">${p.length_km == null ? '—' : d3fmt(p.length_km, 1) + ' km'}</span>
        <span class="pill">${p.stations == null ? '—' : p.stations + ' stations'}</span>
        <span class="pill">${p.cost_per_km == null ? '—' : '$' + d3fmt(p.cost_per_km, 0) + 'M/km'}</span>
      </div>
    </div>`).join('');
    panel.innerHTML = `
    <div class="country-name">${country.country_name}</div>
    <div class="country-sub">Click a different country on the map to update this panel.</div>
    ${metrics}
    <h3 style="margin-top:2px;">Projects in this view</h3>
    <div class="project-list">${projectCards || '<div class="footer-note">No projects match the active filters.</div>'}</div>
  `;
}

function fmtYears(p) {
    if (p.start_year && p.end_year) return `${p.start_year}–${p.end_year}`;
    if (p.start_year) return `${p.start_year}–`;
    return 'year n/a';
}

function featuredProjects(projects) {
    const picked = [];

    for (const target of FEATURED_PROJECT_TARGETS) {
        const matches = projects
            .filter(p => target.match(p))
            .sort((a, b) => (b.cost_per_km ?? -1) - (a.cost_per_km ?? -1));

        if (matches.length) {
            picked.push({
                project: matches[0],
                why: target.why
            });
        }
    }

    // de-dupe in case one project matches twice
    const seen = new Set();
    return picked.filter(({ project }) => {
        const key = project.project_name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function renderFeaturedPanel() {
    const panel = document.getElementById('featured-panel');
    if (!panel) return;

    const rows = featuredProjects(DATA.projects);

    const cards = rows.map(({ project: p, why }) => `
    <div class="project featured-project">
      <div class="title">${p.project_name}</div>
      <div class="meta">${p.city}, ${p.country_name} · ${fmtYears(p)}</div>
      <div class="pill-row">
        <span class="pill ${dominantPillClass(p.dominant_alignment)}">${p.dominant_alignment ?? 'Unknown'}</span>
        <span class="pill">${p.length_km == null ? '—' : d3fmt(p.length_km, 1) + ' km'}</span>
        <span class="pill">${p.stations == null ? '—' : p.stations + ' stations'}</span>
        <span class="pill">${p.cost_per_km == null ? '—' : '$' + d3fmt(p.cost_per_km, 0) + 'M/km'}</span>
      </div>
      <div class="footer-note" style="margin-top:10px;">${why}</div>
    </div>
  `).join('');

    panel.innerHTML = `
    <h3>Featured projects</h3>
    <div class="footer-note" style="margin-bottom:12px;">
      These examples add context to the map by showing well-known outliers and one lower-cost comparator.
    </div>
    <div class="project-list">
      ${cards}
    </div>
  `;
}

// initialize and render map
function initControls() {
    const years = DATA.projects.map(d => d.start_year).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearMinInput = document.getElementById('year-min');
    const yearMaxInput = document.getElementById('year-max');
    yearMinInput.value = minYear;
    yearMaxInput.value = maxYear;
    state.yearMin = minYear;
    state.yearMax = maxYear;
    yearMinInput.addEventListener('input', e => { state.yearMin = e.target.value ? +e.target.value : null; renderAll(); });
    yearMaxInput.addEventListener('input', e => { state.yearMax = e.target.value ? +e.target.value : null; renderAll(); });
    document.getElementById('metric-select').addEventListener('change', e => { state.metric = e.target.value; renderAll(); });
    document.getElementById('sort-select').addEventListener('change', e => { state.sort = e.target.value; renderAll(); });
    document.getElementById('log-toggle').addEventListener('change', e => { state.logScale = e.target.checked; renderAll(); });
    document.getElementById('hemisphere-filter').addEventListener('change', e => {
        state.hemisphere = e.target.value;
        state.selectedCountry = null;
        renderAll();
    });
}

function renderAll() {
    const countryData = recomputeCountries();
    renderHeadlineStats(countryData);
    renderMap(countryData);
    renderScatter(filteredProjects());
    renderCountryPanel(countryData);
    renderFeaturedPanel();
}

loadData().catch(err => {
    console.error(err);
    document.getElementById('country-panel').innerHTML = `<h3>Data failed to load</h3><div class="footer-note">${err.message}</div>`;
});