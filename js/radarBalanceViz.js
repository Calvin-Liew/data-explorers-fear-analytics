
(function () {
    const RADAR_SEL = "#viz-radar";
    const CSV_URL = "data/horror_ai_analysis_datasets/horror_signals.csv";
    const IMDB_CSV_URL = "data/imbd-movies-dataset/imdb_179_horror.csv";

    
    let imdbRatings = new Map();
    
    let movieGalleryData = [];
    let movieDataMap = new Map();

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

    function buildMovieDataMap(rows) {
        const map = new Map();
        rows.forEach(row => {
            const title = row.Title || row.title || row.Film || row.film || row.name;
            if (!title) return;
            const key = slugifyTitle(title);
            if (!map.has(key)) {
                map.set(key, row);
            }
        });
        return map;
    }

    
    function findMovieByRadarTitle(radarTitle) {
        
        const cleaned = radarTitle.replace(/_Unknown$/, "").replace(/-/g, " ");
        const slug = slugifyTitle(cleaned);
        
        
        if (movieDataMap.has(slug)) {
            return movieDataMap.get(slug);
        }
        
        
        for (const [key, movie] of movieDataMap.entries()) {
            const movieTitle = slugifyTitle(movie.Title || movie.title || "");
            
            if (slug.includes(movieTitle) || movieTitle.includes(slug)) {
                return movie;
            }
            
            const cleanedNoYear = cleaned.replace(/\s*\(\d{4}\)\s*$/, "").trim();
            const slugNoYear = slugifyTitle(cleanedNoYear);
            if (slugNoYear && (slugNoYear.includes(movieTitle) || movieTitle.includes(slugNoYear))) {
                return movie;
            }
        }
        
        return null;
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
        
        const byFilm = new Map();
        
        
        data.forEach(row => {
            const film = row.film_title;
            if (film && !byFilm.has(film)) {
                byFilm.set(film, families.reduce((acc, fam) => (acc[fam] = 0, acc), {}));
            }
        });

        
        data.forEach(row => {
            const film = row.film_title;
            if (!film) return;
            
            const filmData = byFilm.get(film);
            Object.keys(row).forEach(key => {
                
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

        
        const defs = svg.append("defs");
        
        
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

        
        families.forEach((fam, i) => {
            const a = i * angleSlice - Math.PI / 2;
            svg.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", Math.cos(a) * radius).attr("y2", Math.sin(a) * radius)
                .attr("stroke", "#39ff14")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5)
                .style("filter", "drop-shadow(0 0 2px rgba(57, 255, 20, 0.4))");

            
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

        
        svg.append("path")
            .attr("d", d3.line().curve(d3.curveCardinalClosed.tension(0.65))(poly))
            .attr("fill", "url(#radar-fill-gradient)")
            .attr("stroke", "#ff224e")
            .attr("stroke-width", 3)
            .style("filter", "url(#radar-glow)")
            .style("mix-blend-mode", "screen");

        
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
        
        const scores = rows.map(row => {
            let weightedScore = 0;
            let totalWeight = 0;
            
            families.forEach(fam => {
                const userVal = userPrefs[fam] || 0;
                const filmVal = row[fam] || 0;
                
                
                
                const diff = Math.abs(userVal - filmVal);
                
                
                
                let matchScore = 0;
                if (diff <= 0.2) {
                    matchScore = 1.0; 
                } else if (diff <= 0.35) {
                    matchScore = 0.8; 
                } else if (diff <= 0.5) {
                    matchScore = 0.6; 
                } else if (diff <= 0.65) {
                    matchScore = 0.4; 
                } else {
                    matchScore = 0.2; 
                }
                
                
                const weight = userVal > 0.3 ? 1.5 : 1.0; 
                
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
        
        
        scores.sort((a, b) => b.similarity - a.similarity);
        
        
        
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

            
            slider.node().style.setProperty("-webkit-appearance", "none");
            slider.node().style.setProperty("appearance", "none");
            
            sliders[fam] = slider;
        });

        
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

        
        prefContainer.append("div")
            .attr("id", "recommendation-results")
            .style("margin-top", "24px")
            .style("min-height", "100px");
    }

    
    function showMovieModal(movieData) {
        
        let modal = d3.select("#movie-detail-modal");
        if (modal.empty()) {
            modal = d3.select("body").append("div").attr("id", "movie-detail-modal");
            const modalContent = modal.append("div").attr("class", "modal-content");
            const closeButton = modal.append("span").attr("class", "close-button").html("&times;");
            
            closeButton.on("click", hideMovieModal);
            modal.on("click", function(event) {
                if (event.target === this) hideMovieModal();
            });
        }
        
        const modalContent = modal.select(".modal-content");
        modalContent.html(`
            <img src="${movieData.Poster || ''}" alt="${movieData.Title || ''}" class="modal-poster" onerror="this.style.display='none'">
            <div class="modal-info">
                <h2>${movieData.Title || 'Unknown'} (${parseInt(movieData.Year) || '?'})</h2>
                <div class="modal-meta">
                    <span>${movieData.Certificate || 'N/A'}</span>
                    <span>${movieData.Duration || '?'} min</span>
                    <span>⭐ ${movieData.Rating || 'N/A'}</span>
                    ${movieData.Metascore ? `<span>Metascore: ${movieData.Metascore}</span>` : ''}
                </div>
                <p class="genre"><strong>Genre:</strong> ${movieData.Genre || 'Unknown'}</p>
                <p class="director"><strong>Director:</strong> ${movieData.Director || 'Unknown'}</p>
                <p class="cast"><strong>Cast:</strong> ${movieData.Cast || 'Unknown'}</p>
                <p class="description">${movieData.Description || 'No description available.'}</p>
                ${movieData.Review ? `
                <div class="review-section">
                    <h4>"${movieData['Review Title'] || 'Review'}"</h4>
                    <p class="review-text">"${(movieData.Review || '').substring(0, 400)}..."</p>
                </div>
                ` : ''}
            </div>
        `);
        
        modal.style("display", "flex");
        setTimeout(() => modal.classed("visible", true), 10);
    }
    
    function hideMovieModal() {
        const modal = d3.select("#movie-detail-modal");
        modal.classed("visible", false);
        setTimeout(() => modal.style("display", "none"), 300);
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
            .style("grid-template-columns", "repeat(auto-fill, minmax(180px, 1fr))")
            .style("gap", "16px");

        matches.forEach((match, idx) => {
            const filmName = match.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            const movieData = findMovieByRadarTitle(match.film);
            
            const matchCard = matchList.append("div")
                .attr("class", "recommendation-card")
                .style("padding", "0")
                .style("background", "rgba(0, 0, 0, 0.5)")
                .style("border", "1px solid rgba(57, 255, 20, 0.3)")
                .style("border-radius", "8px")
                .style("cursor", "pointer")
                .style("transition", "all 0.3s ease")
                .style("overflow", "hidden")
                .on("click", function() {
                    if (movieData) {
                        showMovieModal(movieData);
                    } else {
                        
                        const filmSelect = document.getElementById("radar-film-select");
                        if (filmSelect) {
                            filmSelect.value = match.film;
                            filmSelect.dispatchEvent(new Event("change"));
                        }
                    }
                })
                .on("mouseover", function() {
                    d3.select(this)
                        .style("border-color", "#39ff14")
                        .style("box-shadow", "0 0 15px rgba(57, 255, 20, 0.5)")
                        .style("transform", "translateY(-3px)");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("border-color", "rgba(57, 255, 20, 0.3)")
                        .style("box-shadow", "none")
                        .style("transform", "translateY(0)");
                });

            
            if (movieData && movieData.Poster) {
                const posterContainer = matchCard.append("div")
                    .style("width", "100%")
                    .style("height", "260px")
                    .style("overflow", "hidden")
                    .style("background", "rgba(10, 0, 0, 0.8)");
                
                posterContainer.append("img")
                    .attr("src", movieData.Poster)
                    .attr("alt", movieData.Title || filmName)
                    .style("width", "100%")
                    .style("height", "100%")
                    .style("object-fit", "cover")
                    .on("error", function() {
                        d3.select(this).remove();
                        posterContainer.append("div")
                            .style("display", "flex")
                            .style("align-items", "center")
                            .style("justify-content", "center")
                            .style("height", "100%")
                            .style("color", "#39ff14")
                            .style("font-family", "'Special Elite', monospace")
                            .style("font-size", "12px")
                            .style("text-align", "center")
                            .style("padding", "10px")
                            .text(filmName);
                    });
            } else {
                
                matchCard.append("div")
                    .style("width", "100%")
                    .style("height", "260px")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("justify-content", "center")
                    .style("background", "rgba(10, 0, 0, 0.8)")
                    .style("color", "#39ff14")
                    .style("font-family", "'Special Elite', monospace")
                    .style("font-size", "12px")
                    .style("text-align", "center")
                    .style("padding", "10px")
                    .text(filmName);
            }

            
            const infoSection = matchCard.append("div")
                .style("padding", "12px");

            infoSection.append("div")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#39ff14")
                .style("font-weight", "700")
                .style("font-size", "13px")
                .style("margin-bottom", "6px")
                .style("line-height", "1.3")
                .text(movieData ? (movieData.Title || filmName) : filmName);

            
            if (movieData && movieData.Rating) {
                infoSection.append("div")
                    .style("font-family", "'Special Elite', monospace")
                    .style("color", "#ffdd55")
                    .style("font-size", "11px")
                    .style("margin-bottom", "4px")
                    .text(`⭐ ${movieData.Rating}`);
            }

            infoSection.append("div")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#b0ffb0")
                .style("font-size", "10px")
                .text(`Match: ${(match.similarity * 100).toFixed(0)}%`);
        });
    }

    function init() {
        console.log("🎯 Radar Balance Viz initializing...");
        const container = d3.select(RADAR_SEL);
        if (container.empty()) {
            console.error("❌ Radar container not found:", RADAR_SEL);
            return;
        }
        
        Promise.all([
            d3.csv(CSV_URL, d3.autoType),
            d3.csv(IMDB_CSV_URL, d3.autoType).catch(err => {
                console.warn("IMDB ratings failed to load", err);
                return [];
            })
        ]).then(([raw, imdbRaw]) => {
            if (!raw || !raw.length) {
                console.error("❌ No radar data loaded");
                container.append("div")
                    .attr("class", "error")
                    .style("color", "#ff224e")
                    .style("font-family", "'Special Elite', monospace")
                    .style("padding", "2rem")
                    .text("⚠ No data loaded. Check console for details.");
                return;
            }
            console.log("✅ Radar data loaded:", raw.length, "rows");

            
            if (imdbRaw && imdbRaw.length) {
                imdbRatings = buildImdbRatingMap(imdbRaw);
                movieGalleryData = imdbRaw;
                movieDataMap = buildMovieDataMap(imdbRaw);
            } else {
                imdbRatings = new Map();
                movieGalleryData = [];
                movieDataMap = new Map();
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
