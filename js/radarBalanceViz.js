// js/radarBalanceViz.js (REV 3) — Enhanced with horror_signals.csv data
(function () {
    const RADAR_SEL = "#viz-radar";
    const CSV_URL = "data/horror_ai_analysis_datasets/horror_signals.csv";
    const IMDB_CSV_URL = "data/imbd-movies-dataset/imdb_179_horror.csv";

    // Global cache for IMDB ratings (slug -> rating)
    let imdbRatings = new Map();

    function slugifyTitle(str) {
        return String(str || "")
            .toLowerCase()
            .replace(/[_\-]+/g, "-")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function buildImdbRatingMap(rows) {
        const map = new Map();
        rows.forEach(row => {
            const title = row.Title || row.title || row.Film || row.film || row.name;
            const rating = +row.Rating || +row.rating || +row.IMDB_Rating || +row.imdb_rating;
            if (!title || !rating) return;
            const key = slugifyTitle(title);
            if (!map.has(key)) {
                map.set(key, rating);
            }
        });
        return map;
    }


    const FAMILY_MAP = [
        { 
            family: "Audio", 
            includes: [/scream/i, /screaming/i, /shriek/i, /shrieking/i, /whisper/i, /whispering/i, /silence/i, /silent/i, /quiet/i, /moan/i, /moaning/i, /gasp/i, /gasping/i, /cry/i, /crying/i, /sob/i, /howl/i, /wail/i, /groaning/i, /heartbeat/i, /thud/i, /crash/i, /screech/i, /clank/i, /rustle/i, /bang/i, /sound/i, /music/i] 
        },
        { 
            family: "Visual", 
            includes: [/blood/i, /shadow/i, /shadows/i, /dark/i, /darkness/i, /dim/i, /light/i, /color/i, /mirror/i, /mirrors/i, /windows/i, /mask/i, /masks/i, /costume/i, /costumes/i, /doll/i, /dolls/i] 
        },
        { 
            family: "Pace", 
            includes: [/chase/i, /chasing/i, /running/i, /run/i, /sudden/i, /jump/i, /cut/i, /cutting/i, /tempo/i, /hunt/i, /hunting/i, /stalk/i, /stalking/i, /pursue/i, /pursuing/i, /lurk/i, /lurking/i, /hide/i, /hiding/i, /escape/i, /escaping/i, /flee/i, /fleeing/i, /caught/i, /capture/i, /attack/i, /attacking/i] 
        },
        { 
            family: "Threat", 
            includes: [/monster/i, /monsters/i, /killer/i, /ghost/i, /ghosts/i, /creature/i, /threat/i, /threatening/i, /knife/i, /gun/i, /guns/i, /weapon/i, /weapons/i, /blade/i, /blades/i, /chainsaw/i, /axe/i, /rope/i, /noose/i, /sharp/i, /stab/i, /stabbing/i, /slice/i, /slicing/i, /menace/i, /violent/i, /brutal/i, /aggressive/i, /hostile/i, /dangerous/i, /menacing/i, /demon/i, /demons/i] 
        },
        { 
            family: "Setting", 
            includes: [/night/i, /forest/i, /woods/i, /house/i, /basement/i, /attic/i, /asylum/i, /cabin/i, /rain/i, /storm/i, /fog/i, /foggy/i, /cemetery/i, /graveyard/i, /abandoned/i, /empty/i, /deserted/i, /remote/i, /underground/i, /tunnel/i, /tunnels/i, /isolated/i] 
        },
        { 
            family: "Psyche", 
            includes: [/mad/i, /insane/i, /parano/i, /paranoid/i, /dream/i, /hallucin/i, /fear/i, /fearful/i, /creepy/i, /scary/i, /frightening/i, /terrified/i, /dread/i, /dreadful/i, /uneasy/i, /anxious/i, /nervous/i, /worried/i, /disturbed/i, /disturbing/i, /horrifying/i, /terrifying/i, /shocking/i, /shocked/i, /surprised/i, /alarmed/i, /panic/i, /panicking/i, /afraid/i, /scared/i, /spooky/i, /haunting/i, /eerie/i, /ominous/i, /sinister/i, /strange/i, /weird/i, /odd/i, /unusual/i, /bizarre/i, /mysterious/i, /unseen/i, /hidden/i, /secret/i, /evil/i, /possessed/i, /possession/i, /supernatural/i, /paranormal/i, /satan/i, /hell/i, /hellish/i, /witch/i, /witches/i, /cult/i, /cults/i, /ritual/i, /rituals/i, /curse/i, /cursed/i, /haunted/i, /spirit/i, /spirits/i, /devil/i, /terror/i, /trapped/i, /dead/i, /alone/i, /follow/i, /following/i, /followed/i] 
        },
    ];
    const families = FAMILY_MAP.map(d => d.family);

    function matchFamily(signalName) {
        // Remove 'hs_' prefix if present
        const cleanSignal = signalName.replace(/^hs_/i, '');
        for (const f of FAMILY_MAP) { 
            if (f.includes.some(rx => rx.test(cleanSignal))) return f.family; 
        }
        return "Psyche";
    }
    
    function normalize(vals) {
        const max = Math.max(1e-9, d3.max(vals));
        return vals.map(v => (v || 0) / max);
    }

    function processHorrorSignals(data) {
        // Process long-format data: one row per scene, aggregate by film
        const byFilm = new Map();
        
        // First pass: collect all films and initialize
        data.forEach(row => {
            const film = row.film_title;
            if (film && !byFilm.has(film)) {
                byFilm.set(film, families.reduce((acc, fam) => (acc[fam] = 0, acc), {}));
            }
        });

        // Second pass: aggregate signal counts by family
        data.forEach(row => {
            const film = row.film_title;
            if (!film) return;
            
            const filmData = byFilm.get(film);
            Object.keys(row).forEach(key => {
                // Skip non-signal columns
                if (/film|title|scene|heading/i.test(key)) return;
                
                const val = +row[key] || 0;
                if (val > 0) {
                    const family = matchFamily(key);
                    filmData[family] += val;
                }
            });
        });

        const films = Array.from(byFilm.keys()).sort();
        const rows = films.map(f => {
            const obj = byFilm.get(f);
            const vals = families.map(k => obj[k]);
            const norm = normalize(vals);
            const out = { film: f };
            families.forEach((k, i) => out[k] = norm[i]);
            return out;
        });
        
        return { films, rows };
    }

    function drawRadar(selector, rows, film) {
        d3.select(selector).selectAll("*").remove();

        const container = d3.select(selector).node();
        const containerWidth = container ? container.clientWidth : 1200;
        const containerHeight = 600;
        
        const margin = { top: 60, right: 60, bottom: 60, left: 60 };
        const w = containerWidth - margin.left - margin.right;
        const h = containerHeight - margin.top - margin.bottom;
        const radius = Math.min(w, h) / 2.2;

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .style("background", "rgba(5, 0, 10, 0.3)")
            .append("g")
            .attr("transform", `translate(${margin.left + w / 2}, ${margin.top + h / 2})`);

        // Add defs for gradients and filters
        const defs = svg.append("defs");
        
        // Glow filter
        const glowFilter = defs.append("filter")
            .attr("id", "radar-glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        glowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "4")
            .attr("result", "coloredBlur");
        glowFilter.append("feMerge")
            .append("feMergeNode")
            .attr("in", "coloredBlur");
        glowFilter.append("feMerge")
            .append("feMergeNode")
            .attr("in", "SourceGraphic");

        // Radial gradient for fill
        const fillGradient = defs.append("linearGradient")
            .attr("id", "radar-fill-gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", -radius)
            .attr("x2", 0).attr("y2", radius);
        fillGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ff224e")
            .attr("stop-opacity", 0.4);
        fillGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#8b0000")
            .attr("stop-opacity", 0.2);

        const levels = 5;
        const angleSlice = (Math.PI * 2) / families.length;

        // Draw concentric rings with enhanced styling
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
                ring.attr("stroke", "none");
            } else {
                ring.attr("stroke", "#39ff14")
                    .attr("stroke-opacity", lvl === 1 ? 0.3 : 0.15)
                    .attr("stroke-width", lvl === 1 ? 2 : 1)
                    .style("filter", "drop-shadow(0 0 3px rgba(57, 255, 20, 0.3))");
            }
        }

        // Draw axis lines with glow
        families.forEach((fam, i) => {
            const a = i * angleSlice - Math.PI / 2;
            svg.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", Math.cos(a) * radius).attr("y2", Math.sin(a) * radius)
                .attr("stroke", "#39ff14")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5)
                .style("filter", "drop-shadow(0 0 2px rgba(57, 255, 20, 0.4))");

            // Enhanced labels
            svg.append("text")
                .attr("x", Math.cos(a) * (radius + 28))
                .attr("y", Math.sin(a) * (radius + 28))
                .attr("text-anchor", Math.cos(a) > 0.1 ? "start" : (Math.cos(a) < -0.1 ? "end" : "middle"))
                .attr("dominant-baseline", "middle")
                .attr("class", "radar-label")
                .style("font-family", "'Special Elite', monospace")
                .style("font-size", "14px")
                .style("fill", "#39ff14")
                .style("text-shadow", "0 0 8px rgba(57, 255, 20, 0.8), 0 0 4px rgba(57, 255, 20, 0.6)")
                .style("font-weight", "600")
                .style("letter-spacing", "1px")
                .text(fam);
        });

        const row = rows.find(r => r.film === film) || rows[0];
        if (!row) return;
        
        const values = families.map(k => +row[k] || 0);
        const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);
        const poly = families.map((_, i) => {
            const a = i * angleSlice - Math.PI / 2;
            return [Math.cos(a) * rScale(values[i]), Math.sin(a) * rScale(values[i])];
        });

        // Draw filled polygon with gradient
        svg.append("path")
            .attr("d", d3.line().curve(d3.curveCardinalClosed.tension(0.65))(poly))
            .attr("fill", "url(#radar-fill-gradient)")
            .attr("stroke", "#ff224e")
            .attr("stroke-width", 3)
            .style("filter", "url(#radar-glow)")
            .style("mix-blend-mode", "screen");

        // Draw data points with glow
        svg.selectAll(".radar-dot")
            .data(poly)
            .enter().append("circle")
            .attr("class", "radar-dot")
            .attr("r", 5)
            .attr("cx", d => d[0])
            .attr("cy", d => d[1])
            .attr("fill", "#ff224e")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 34, 78, 0.9))");

        // Enhanced title with more spacing
        const filmName = row.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        svg.append("text")
            .attr("y", -radius - 55)
            .attr("text-anchor", "middle")
            .attr("class", "radar-title")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "20px")
            .style("fill", "#ff224e")
            .style("text-shadow", "0 0 12px rgba(255, 34, 78, 0.9), 0 0 6px rgba(255, 34, 78, 0.6)")
            .style("font-weight", "700")
            .style("letter-spacing", "2px")
            .text(filmName);
        // Add IMDB rating in the top-right corner of the radar
        if (imdbRatings && imdbRatings.size) {
            const prettyTitle = row.film.replace(/_Unknown$/, "").replace(/-/g, " ");
            const imdbKey = slugifyTitle(prettyTitle);
            const rating = imdbRatings.get(imdbKey);

            const label = (rating && !Number.isNaN(rating))
                ? `⭐ IMDB: ${rating.toFixed(1)} / 10`
                : "⭐ IMDB: N/A";

            svg.append("text")
                .attr("x", radius * 0.9)
                .attr("y", -radius - 10)
                .attr("text-anchor", "end")
                .attr("class", "radar-imdb-rating")
                .style("font-family", "'Special Elite', monospace")
                .style("font-size", "14px")
                .style("fill", "#ffdd55")
                .style("text-shadow", "0 0 10px rgba(255, 221, 85, 0.9)")
                .style("letter-spacing", "1px")
                .text(label);
        }

    }

    function findMatchingFilms(userPrefs, rows, threshold = 0.4) {
        // Calculate similarity score for each film using a more lenient approach
        const scores = rows.map(row => {
            let weightedScore = 0;
            let totalWeight = 0;
            
            families.forEach(fam => {
                const userVal = userPrefs[fam] || 0;
                const filmVal = row[fam] || 0;
                
                // Use a more forgiving distance calculation
                // Give partial credit for being close, not just exact matches
                const diff = Math.abs(userVal - filmVal);
                
                // Weighted scoring: closer values get more points
                // If difference is small, give high score; if large, still give some credit
                let matchScore = 0;
                if (diff <= 0.2) {
                    matchScore = 1.0; // Very close match
                } else if (diff <= 0.35) {
                    matchScore = 0.8; // Good match
                } else if (diff <= 0.5) {
                    matchScore = 0.6; // Decent match
                } else if (diff <= 0.65) {
                    matchScore = 0.4; // Somewhat similar
                } else {
                    matchScore = 0.2; // Still somewhat related
                }
                
                // Weight by user preference strength (if user cares about this, weight it more)
                const weight = userVal > 0.3 ? 1.5 : 1.0; // Boost weight if user has strong preference
                
                weightedScore += matchScore * weight;
                totalWeight += weight;
            });
            
            const similarity = totalWeight > 0 ? weightedScore / totalWeight : 0;
            
            return {
                film: row.film,
                similarity: similarity,
                rawSimilarity: similarity
            };
        });
        
        // Sort by similarity (best matches first)
        scores.sort((a, b) => b.similarity - a.similarity);
        
        // Return top matches with more lenient threshold
        // Show top 5-8 films that have at least some similarity
        return scores.filter(s => s.similarity >= 0.3).slice(0, 8);
    }

    function initRecommendationSystem(rows) {
        const prefContainer = d3.select("#radar-preference-panel");
        if (prefContainer.empty()) return;

        const sliders = {};
        const descriptions = {
            Audio: "Screams, whispers, silence, and sound effects that build atmosphere",
            Visual: "Blood, shadows, darkness, and visual horror elements",
            Pace: "Chase scenes, running, sudden jumps, and action tempo",
            Threat: "Monsters, killers, ghosts, weapons, and direct danger",
            Setting: "Night scenes, forests, houses, basements, and atmospheric locations",
            Psyche: "Fear, paranoia, madness, supernatural dread, and psychological horror"
        };

        // Create sliders for each family
        families.forEach((fam, idx) => {
            const sliderGroup = prefContainer.append("div")
                .attr("class", "preference-slider-group")
                .style("margin-bottom", "20px");

            const labelRow = sliderGroup.append("div")
                .style("display", "flex")
                .style("justify-content", "space-between")
                .style("align-items", "center")
                .style("margin-bottom", "8px");

            labelRow.append("label")
                .attr("for", `pref-${fam}`)
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#39ff14")
                .style("font-weight", "600")
                .style("font-size", "14px")
                .style("letter-spacing", "1px")
                .text(fam);

            labelRow.append("span")
                .attr("class", `pref-value-${fam}`)
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#ff224e")
                .style("font-weight", "700")
                .style("font-size", "14px")
                .text("0.5");

            sliderGroup.append("p")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#b0ffb0")
                .style("font-size", "11px")
                .style("margin-bottom", "6px")
                .style("opacity", "0.8")
                .text(descriptions[fam]);

            const sliderContainer = sliderGroup.append("div")
                .style("position", "relative");

            const slider = sliderContainer.append("input")
                .attr("type", "range")
                .attr("id", `pref-${fam}`)
                .attr("min", "0")
                .attr("max", "1")
                .attr("step", "0.05")
                .attr("value", "0.5")
                .style("width", "100%")
                .style("height", "8px")
                .style("background", "rgba(57, 255, 20, 0.2)")
                .style("border-radius", "4px")
                .style("outline", "none")
                .style("cursor", "pointer")
                .style("-webkit-appearance", "none")
                .on("input", function() {
                    const val = +this.value;
                    d3.select(`.pref-value-${fam}`).text(val.toFixed(2));
                    updateRecommendations(rows);
                });

            // Style the slider thumb
            slider.node().style.setProperty("-webkit-appearance", "none");
            slider.node().style.setProperty("appearance", "none");
            
            sliders[fam] = slider;
        });

        // Add recommendation button
        const buttonRow = prefContainer.append("div")
            .style("display", "flex")
            .style("justify-content", "center")
            .style("margin-top", "24px");

        buttonRow.append("button")
            .attr("id", "find-recommendations")
            .style("padding", "12px 32px")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "14px")
            .style("font-weight", "700")
            .style("letter-spacing", "2px")
            .style("text-transform", "uppercase")
            .style("color", "#0a0a0a")
            .style("background", "#39ff14")
            .style("border", "2px solid #39ff14")
            .style("border-radius", "6px")
            .style("cursor", "pointer")
            .style("box-shadow", "0 0 15px rgba(57, 255, 20, 0.5)")
            .style("transition", "all 0.3s ease")
            .text("Find My Horror Match")
            .on("mouseover", function() {
                d3.select(this)
                    .style("background", "#ff224e")
                    .style("border-color", "#ff224e")
                    .style("box-shadow", "0 0 20px rgba(255, 34, 78, 0.7)")
                    .style("transform", "translateY(-2px)");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("background", "#39ff14")
                    .style("border-color", "#39ff14")
                    .style("box-shadow", "0 0 15px rgba(57, 255, 20, 0.5)")
                    .style("transform", "translateY(0)");
            })
            .on("click", () => updateRecommendations(rows));

        // Recommendation results container
        prefContainer.append("div")
            .attr("id", "recommendation-results")
            .style("margin-top", "24px")
            .style("min-height", "100px");
    }

    function updateRecommendations(rows) {
        const userPrefs = {};
        families.forEach(fam => {
            const slider = document.getElementById(`pref-${fam}`);
            if (slider) {
                userPrefs[fam] = +slider.value;
            }
        });

        const matches = findMatchingFilms(userPrefs, rows);
        const resultsContainer = d3.select("#recommendation-results");
        resultsContainer.selectAll("*").remove();

        if (matches.length === 0) {
            resultsContainer.append("p")
                .style("color", "#b0ffb0")
                .style("font-family", "'Special Elite', monospace")
                .style("text-align", "center")
                .style("padding", "20px")
                .style("font-size", "13px")
                .text("Adjust your preferences above and recommendations will appear here. The system finds films with similar horror styles, so even partial matches will be shown.");
            return;
        }

        resultsContainer.append("h4")
            .style("font-family", "'Special Elite', monospace")
            .style("color", "#39ff14")
            .style("font-size", "16px")
            .style("margin-bottom", "16px")
            .style("text-align", "center")
            .style("letter-spacing", "1px")
            .text(`🎬 ${matches.length} RECOMMENDED FILM${matches.length > 1 ? 'S' : ''} 🎬`);

        const matchList = resultsContainer.append("div")
            .style("display", "grid")
            .style("grid-template-columns", "repeat(auto-fit, minmax(200px, 1fr))")
            .style("gap", "12px");

        matches.forEach((match, idx) => {
            const filmName = match.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            const matchCard = matchList.append("div")
                .attr("class", "recommendation-card")
                .style("padding", "12px 16px")
                .style("background", "rgba(0, 0, 0, 0.4)")
                .style("border", "1px solid rgba(57, 255, 20, 0.3)")
                .style("border-radius", "8px")
                .style("cursor", "pointer")
                .style("transition", "all 0.3s ease")
                .on("click", function() {
                    const filmSelect = document.getElementById("radar-film-select");
                    if (filmSelect) {
                        filmSelect.value = match.film;
                        filmSelect.dispatchEvent(new Event("change"));
                    }
                })
                .on("mouseover", function() {
                    d3.select(this)
                        .style("border-color", "#39ff14")
                        .style("box-shadow", "0 0 12px rgba(57, 255, 20, 0.4)")
                        .style("transform", "translateY(-2px)");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("border-color", "rgba(57, 255, 20, 0.3)")
                        .style("box-shadow", "none")
                        .style("transform", "translateY(0)");
                });

            matchCard.append("div")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#39ff14")
                .style("font-weight", "700")
                .style("font-size", "13px")
                .style("margin-bottom", "4px")
                .text(filmName);

            matchCard.append("div")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#b0ffb0")
                .style("font-size", "11px")
                .text(`Match: ${(match.similarity * 100).toFixed(0)}%`);
        });
    }

    function init() {
        Promise.all([
            d3.csv(CSV_URL, d3.autoType),
            d3.csv(IMDB_CSV_URL, d3.autoType).catch(err => {
                console.warn("IMDB ratings failed to load", err);
                return [];
            })
        ]).then(([raw, imdbRaw]) => {
            if (!raw || !raw.length) {
                console.error("No data loaded");
                return;
            }

            // Build IMDB rating lookup
            if (imdbRaw && imdbRaw.length) {
                imdbRatings = buildImdbRatingMap(imdbRaw);
            } else {
                imdbRatings = new Map();
            }

            const { films, rows } = processHorrorSignals(raw);

            if (!films || films.length === 0) {
                console.error("No films found in data");
                return;
            }

            const sel = d3.select("#radar-film-select");
            sel.selectAll("option").remove();
            sel.selectAll("option")
                .data(films)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()));

            const initial = films[0];
            sel.property("value", initial);
            drawRadar(RADAR_SEL, rows, initial);

            sel.on("change", function () {
                drawRadar(RADAR_SEL, rows, this.value);
            });

            // Initialize recommendation system
            initRecommendationSystem(rows);
        }).catch(err => {
            console.error("Radar load error", err);
            d3.select(RADAR_SEL).append("div")
                .attr("class", "error")
                .style("color", "#ff224e")
                .style("font-family", "'Special Elite', monospace")
                .style("padding", "2rem")
                .text("⚠ Radar failed to load. Check console for details.");
        });
    }


    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
})();
