// js/radarBalanceViz.js (REV 2) — robust to wide-format viz1 file
(function () {
    const RADAR_SEL = "#viz-radar";
    const CSV_URL = "data/cleaner_datasets/viz1_horror_signals_by_film.csv";

    const FAMILY_MAP = [
        { family: "Audio", includes: [/sound/i, /scream/i, /music/i, /whisper/i, /silence/i] },
        { family: "Visual", includes: [/blood/i, /shadow/i, /dark/i, /light/i, /color/i] },
        { family: "Pace", includes: [/chase/i, /running/i, /sudden/i, /jump/i, /cut/i, /tempo/i] },
        { family: "Threat", includes: [/monster/i, /killer/i, /ghost/i, /creature/i, /threat/i, /knife/i] },
        { family: "Setting", includes: [/night/i, /forest/i, /house/i, /basement/i, /rain/i, /storm/i] },
        { family: "Psyche", includes: [/mad/i, /insane/i, /parano/i, /dream/i, /hallucin/i, /fear/i, /creepy/i] },
    ];
    const families = FAMILY_MAP.map(d => d.family);
    const isSignalCol = (col) => !/film|title|movie|total|sum|count/i.test(col);

    function matchFamily(signal) {
        for (const f of FAMILY_MAP) { if (f.includes.some(rx => rx.test(signal))) return f.family; }
        return "Psyche";
    }
    function normalize(vals) {
        const max = Math.max(1e-9, d3.max(vals));
        return vals.map(v => (v || 0) / max);
    }

    function processWide(data) {
        // Expect wide format: one row per film, signal columns with numeric counts.
        const cols = Object.keys(data[0]);
        const filmCol = cols.find(c => /film.*title|^title$|^film$/i.test(c)) || cols[0];
        const signalCols = cols.filter(c => isSignalCol(c));
        const films = data.map(d => d[filmCol]).filter(Boolean);

        const byFilm = new Map();
        films.forEach(f => byFilm.set(f, families.reduce((acc, fam) => (acc[fam]=0, acc), {})));

        data.forEach(row => {
            const film = row[filmCol];
            signalCols.forEach(col => {
                const val = +row[col] || 0;
                const fam = matchFamily(col);
                byFilm.get(film)[fam] += val;
            });
        });

        const rows = films.map(f => {
            const obj = byFilm.get(f);
            const vals = families.map(k => obj[k]);
            const norm = normalize(vals);
            const out = { film: f };
            families.forEach((k,i)=>out[k]=norm[i]);
            return out;
        });
        return { films, rows };
    }

    function drawRadar(selector, rows, film) {
        d3.select(selector).selectAll("*").remove();

        const margin = { top: 30, right: 30, bottom: 30, left: 30 };
        const w = Math.min(560, d3.select(selector).node().clientWidth || 560) - margin.left - margin.right;
        const h = 520 - margin.top - margin.bottom;
        const radius = Math.min(w, h) / 2;

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left + w / 2}, ${margin.top + h / 2})`);

        const levels = 5;
        const angleSlice = (Math.PI * 2) / families.length;

        for (let lvl = 1; lvl <= levels; lvl++) {
            const r = radius * (lvl / levels);
            const points = d3.range(families.length).map(i => {
                const a = i * angleSlice - Math.PI / 2;
                return [Math.cos(a) * r, Math.sin(a) * r];
            });

            const ring = svg.append("path")
                .attr("d", d3.line().curve(d3.curveLinearClosed)(points))
                .attr("fill", "none");

            if (lvl === levels) {
                // OUTERMOST ring: make edges invisible
                ring.attr("stroke", "none");
            } else {
                ring.attr("stroke", "#ffffff")
                    .attr("stroke-opacity", 0.65)
                    .attr("stroke-width", 1.2);
            }

        }


        families.forEach((fam, i) => {
            const a = i * angleSlice - Math.PI / 2;
            svg.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", Math.cos(a) * radius).attr("y2", Math.sin(a) * radius)
                .attr("stroke", "#ffffff")
                .attr("stroke-opacity", 0.8)
                .attr("stroke-width", 1.2);


            svg.append("text")
                .attr("x", Math.cos(a) * (radius + 14))
                .attr("y", Math.sin(a) * (radius + 14))
                .attr("text-anchor", Math.cos(a) > 0.1 ? "start" : (Math.cos(a) < -0.1 ? "end" : "middle"))
                .attr("dominant-baseline", "middle")
                .attr("class", "radar-label")
                .text(fam);
        });

        const row = rows.find(r => r.film === film) || rows[0];
        const values = families.map(k => +row[k] || 0);
        const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);
        const poly = families.map((_, i) => {
            const a = i * angleSlice - Math.PI / 2;
            return [Math.cos(a) * rScale(values[i]), Math.sin(a) * rScale(values[i])];
        });

        svg.append("path")
            .attr("d", d3.line().curve(d3.curveCardinalClosed.tension(0.65))(poly))
            .attr("fill", "var(--accent-weak, #c21a1a)")
            .attr("fill-opacity", 0.25)
            .attr("stroke", "var(--accent-strong, #c21a1a)")
            .attr("stroke-width", 2);

        svg.selectAll(".radar-dot")
            .data(poly)
            .enter().append("circle")
            .attr("class", "radar-dot")
            .attr("r", 3.5)
            .attr("cx", d => d[0])
            .attr("cy", d => d[1])
            .attr("fill", "var(--accent-strong, #c21a1a)");

        svg.append("text")
            .attr("y", -radius - 22)
            .attr("text-anchor", "middle")
            .attr("class", "radar-title")
            .text(row.film);
    }

    function init() {
        d3.csv(CSV_URL, d3.autoType).then(raw => {
            if (!raw || !raw.length) return;
            const { films, rows } = processWide(raw);

            const sel = d3.select("#radar-film-select");
            sel.selectAll("option")
                .data(films)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            const initial = films[0];
            sel.property("value", initial);
            drawRadar(RADAR_SEL, rows, initial);

            sel.on("change", function () {
                drawRadar(RADAR_SEL, rows, this.value);
            });
        }).catch(err => {
            console.error("Radar load error", err);
            d3.select(RADAR_SEL).append("div").attr("class", "error").text("Radar failed to load.");
        });
    }

    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
})();
