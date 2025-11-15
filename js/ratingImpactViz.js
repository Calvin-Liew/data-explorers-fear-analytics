
(function () {
    const VIZ_SEL = "#viz-rating-impact";
    const EFFECTIVENESS_URL = "data/cleaner_datasets/viz3_horror_effectiveness.csv";
    const FILM_COMPARISON_URL = "data/cleaner_datasets/viz4_film_comparison.csv";
    const IMDB_URL = "data/imbd-movies-dataset/imdb_179_horror.csv";
    const HORROR_SIGNALS_URL = "data/horror_ai_analysis_datasets/horror_signals.csv";
    const FEAR_JOURNEY_URL = "data/cleaner_datasets/viz2b_fear_journey.csv";

    function slugifyTitle(str) {
        return String(str || "")
            .toLowerCase()
            .replace(/[_\-]+/g, "-")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function matchFilmTitle(radarTitle, imdbTitle) {
        const radarSlug = slugifyTitle(radarTitle.replace(/_Unknown$/, "").replace(/-/g, " "));
        const imdbSlug = slugifyTitle(imdbTitle);
        return radarSlug === imdbSlug || 
               radarSlug.includes(imdbSlug) || 
               imdbSlug.includes(radarSlug);
    }

    function calculateStateTransitions(filmData) {
        
        
        if (!filmData || filmData.length === 0) return 0;
        
        let transitions = 0;
        let prevState = null;
        
        filmData.forEach(d => {
            const fear = +d.fear_score || 0;
            let state;
            if (fear < 0.3) state = 'calm';
            else if (fear < 0.6) state = 'unease';
            else state = 'panic';
            
            if (prevState && prevState !== state) {
                transitions++;
            }
            prevState = state;
        });
        
        return transitions;
    }

    function calculateAvgImpact(effectivenessData, filmSignalData) {
        
        if (!effectivenessData || effectivenessData.length === 0) return 0;
        if (!filmSignalData || filmSignalData.length === 0) return 0;
        
        
        const effectivenessMap = new Map();
        effectivenessData.forEach(d => {
            const signalName = (d.horror_signal || d.signal || d.name || "").toLowerCase().trim();
            const impact = +d.overall_impact || +d.impact || 0;
            if (signalName && impact > 0) {
                effectivenessMap.set(signalName, impact);
            }
        });
        
        
        const filmImpacts = [];
        filmSignalData.forEach(d => {
            
            Object.keys(d).forEach(key => {
                if (/film|title|scene|heading|fear|tension|sentiment/i.test(key)) return;
                const val = +d[key] || 0;
                if (val > 0) {
                    const signalName = key.replace(/^hs_/i, '').toLowerCase().trim();
                    const impact = effectivenessMap.get(signalName);
                    if (impact) {
                        filmImpacts.push(impact);
                    }
                }
            });
        });
        
        if (filmImpacts.length === 0) {
            
            const topSignals = Array.from(effectivenessMap.values())
                .sort((a, b) => b - a)
                .slice(0, 20);
            return topSignals.length > 0 
                ? topSignals.reduce((a, b) => a + b, 0) / topSignals.length 
                : 0;
        }
        
        return filmImpacts.reduce((a, b) => a + b, 0) / filmImpacts.length;
    }

    function calculatePeakFear(fearJourneyData, filmTitle) {
        
        if (!fearJourneyData || fearJourneyData.length === 0) return { peak: 0, variance: 0, maxSpike: 0 };
        
        const filmKey = filmTitle.replace(/\s+/g, "_").replace(/[^a-z0-9_]/gi, "").toLowerCase();
        const fearValues = [];
        
        fearJourneyData.forEach(row => {
            
            const fear = +row[filmKey] || 
                        +row[filmTitle] || 
                        +row[filmKey + "_unknown"] ||
                        0;
            if (fear > 0) fearValues.push(fear);
        });
        
        if (fearValues.length === 0) return { peak: 0, variance: 0, maxSpike: 0 };
        
        const peak = Math.max(...fearValues);
        const mean = fearValues.reduce((a, b) => a + b, 0) / fearValues.length;
        const variance = fearValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / fearValues.length;
        
        
        let maxSpike = 0;
        for (let i = 1; i < fearValues.length; i++) {
            const spike = Math.abs(fearValues[i] - fearValues[i - 1]);
            if (spike > maxSpike) maxSpike = spike;
        }
        
        return { peak, variance, maxSpike };
    }

    function calculateSignalDiversity(filmSignalData, effectiveness) {
        
        if (!filmSignalData || filmSignalData.length === 0) return 0;
        if (!effectiveness || effectiveness.length === 0) return 0;
        
        
        const effectivenessMap = new Map();
        effectiveness.forEach(d => {
            const signalName = (d.horror_signal || d.signal || d.name || "").toLowerCase().trim();
            const impact = +d.overall_impact || +d.impact || 0;
            if (signalName && impact > 0.3) { 
                effectivenessMap.set(signalName, impact);
            }
        });
        
        
        const uniqueSignals = new Set();
        filmSignalData.forEach(d => {
            Object.keys(d).forEach(key => {
                if (/film|title|scene|heading|fear|tension|sentiment/i.test(key)) return;
                const val = +d[key] || 0;
                if (val > 0) {
                    const signalName = key.replace(/^hs_/i, '').toLowerCase().trim();
                    if (effectivenessMap.has(signalName)) {
                        uniqueSignals.add(signalName);
                    }
                }
            });
        });
        
        return uniqueSignals.size;
    }

    function processData(effectiveness, filmComparison, imdbData, horrorSignals, fearJourney) {
        const joined = [];
        const imdbMap = new Map();
        
        
        imdbData.forEach(d => {
            const title = d.Title || d.title || "";
            if (title) {
                const slug = slugifyTitle(title);
                imdbMap.set(slug, d);
                
                if (d.Year) {
                    const yearSlug = slugifyTitle(`${title} ${d.Year}`);
                    if (!imdbMap.has(yearSlug)) {
                        imdbMap.set(yearSlug, d);
                    }
                }
            }
        });
        
        
        const signalsByFilm = new Map();
        if (horrorSignals && horrorSignals.length > 0) {
            horrorSignals.forEach(d => {
                
                const film = d.film_title || d.film || d.title || d.Film || "";
                if (film && !signalsByFilm.has(film)) {
                    signalsByFilm.set(film, []);
                }
                if (film) {
                    signalsByFilm.get(film).push(d);
                }
            });
        }
        
        console.log(`Processing ${filmComparison?.length || 0} films from comparison dataset`);
        console.log(`IMDB data: ${imdbData?.length || 0} entries`);
        console.log(`Horror signals: ${horrorSignals?.length || 0} rows`);
        
        let matchedCount = 0;
        
        
        filmComparison.forEach(film => {
            const filmTitle = film.film || film.film_title || film.title || "";
            if (!filmTitle) return;
            
            
            let imdbMatch = null;
            const filmSlug = slugifyTitle(filmTitle.replace(/_Unknown$/, "").replace(/-/g, " "));
            
            
            if (imdbMap.has(filmSlug)) {
                imdbMatch = imdbMap.get(filmSlug);
            } else {
                
                for (const [key, value] of imdbMap.entries()) {
                    if (matchFilmTitle(filmTitle, value.Title || value.title || "")) {
                        imdbMatch = value;
                        break;
                    }
                }
            }
            
            if (!imdbMatch) {
                console.log(`No IMDB match for: ${filmTitle}`);
                return;
            }
            
            const rating = +imdbMatch.Rating || +imdbMatch.rating || 0;
            if (rating === 0) return;
            
            matchedCount++;
            
            
            const filmSignalData = signalsByFilm.get(filmTitle) || [];
            const transitions = calculateStateTransitions(filmSignalData);
            
            
            const avgImpact = calculateAvgImpact(effectiveness, filmSignalData);
            
            
            const avgFear = +film.avg_fear || +film.average_fear || +film.fear || +film.mean_fear || 0;
            const avgTension = +film.avg_tension || +film.average_tension || +film.tension || +film.mean_tension || 0;
            const signalCount = +film.signal_count || +film.horror_signals || +film.total_signals || +film.num_signals || 0;
            
            
            const fearMetrics = calculatePeakFear(fearJourney, filmTitle);
            
            
            const signalDiversity = calculateSignalDiversity(filmSignalData, effectiveness);
            
            
            const year = +imdbMatch.Year || +imdbMatch.year || 0;
            
            
            
            const impactScore1 = (fearMetrics.peak * 0.5) + (signalDiversity / 50 * 0.3) + (avgFear * 0.2);
            
            
            const impactScore2 = (avgFear * 0.4) + (avgTension * 0.3) + (signalDiversity / 50 * 0.3);
            
            
            const normalizedTransitions = Math.min(transitions / 100, 1);
            const impactScore3 = (fearMetrics.peak * 0.4) + (fearMetrics.maxSpike * 0.3) + (normalizedTransitions * 0.3);
            
            
            const impactScore = impactScore1; 
            
            joined.push({
                film: filmTitle,
                rating: rating,
                year: year,
                avgFear: avgFear,
                avgTension: avgTension,
                signalCount: signalCount,
                transitions: transitions,
                avgImpact: avgImpact,
                peakFear: fearMetrics.peak,
                fearVariance: fearMetrics.variance,
                maxSpike: fearMetrics.maxSpike,
                signalDiversity: signalDiversity,
                imdbData: imdbMatch,
                impactScore: impactScore,
                impactScore2: impactScore2,
                impactScore3: impactScore3
            });
        });
        
        console.log(`Matched ${matchedCount} films with IMDB ratings`);
        console.log(`Final joined data: ${joined.length} films`);
        
        if (joined.length > 0) {
            const sample = joined[0];
            console.log('Sample film data:', {
                film: sample.film,
                rating: sample.rating,
                impactScore: sample.impactScore,
                avgFear: sample.avgFear,
                peakFear: sample.peakFear,
                signalDiversity: sample.signalDiversity
            });
        }
        
        return joined.filter(d => d.rating > 0);
    }

    function drawGalaxy(selector, data) {
        const host = d3.select(selector);
        host.selectAll("*").remove();

        if (!data || data.length === 0) {
            host.append("div")
                .style("color", "#ff1f6b")
                .style("font-family", "'Special Elite', monospace")
                .style("padding", "2rem")
                .text("No data available");
            return;
        }

        const margin = { top: 80, right: 200, bottom: 100, left: 80 };
        const container = host.node();
        const width = (container ? container.clientWidth : 1200) - margin.left - margin.right;
        const height = 700 - margin.top - margin.bottom;

        
        const controlsContainer = host.append("div")
            .style("margin-bottom", "20px")
            .style("display", "flex")
            .style("gap", "15px")
            .style("flex-wrap", "wrap")
            .style("align-items", "center")
            .style("font-family", "'Special Elite', monospace");

        const svg = host.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("background", "linear-gradient(135deg, rgba(15, 0, 5, 0.95) 0%, rgba(5, 0, 0, 1) 100%)")
            .style("border-radius", "12px")
            .style("box-shadow", "0 0 40px rgba(139, 0, 0, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.6)")
            .style("border", "1px solid rgba(139, 0, 0, 0.4)");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const defs = svg.append("defs");

        
        const glowFilter = defs.append("filter")
            .attr("id", "star-glow")
            .attr("x", "-100%")
            .attr("y", "-100%")
            .attr("width", "300%")
            .attr("height", "300%");
        glowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "4")
            .attr("result", "coloredBlur");
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        
        
        const eyeGlowFilter = defs.append("filter")
            .attr("id", "eye-glow")
            .attr("x", "-200%")
            .attr("y", "-200%")
            .attr("width", "500%")
            .attr("height", "500%");
        eyeGlowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "3")
            .attr("result", "coloredBlur");
        const eyeFeMerge = eyeGlowFilter.append("feMerge");
        eyeFeMerge.append("feMergeNode").attr("in", "coloredBlur");
        eyeFeMerge.append("feMergeNode").attr("in", "SourceGraphic");

        
        const validData = data.filter(d => !isNaN(d.impactScore) && !isNaN(d.rating) && d.impactScore > 0 && d.rating > 0);
        console.log(`Valid data points: ${validData.length} out of ${data.length}`);
        
        if (validData.length === 0) {
            host.append("div")
                .style("color", "#ff1f6b")
                .style("font-family", "'Special Elite', monospace")
                .style("padding", "2rem")
                .style("text-align", "center")
                .html("No valid data points to display.<br>All data points have invalid impact scores or ratings.");
            console.error("No valid data - sample data:", data.slice(0, 3));
            return;
        }
        
        const xExtent = d3.extent(validData, d => d.impactScore);
        const yExtent = d3.extent(validData, d => d.rating);
        const ratingExtent = d3.extent(validData, d => d.rating);

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] * 0.9, xExtent[1] * 1.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
            .range([height, 0]);
        
        
        const voidBackground = g.append("g").attr("class", "void-background");
        
        
        const gridLines = voidBackground.append("g").attr("class", "grid-lines");
        
        
        for (let i = 0; i <= 5; i++) {
            const x = (width / 5) * i;
            gridLines.append("line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "rgba(139, 0, 0, 0.1)")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "2,4");
        }
        
        
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            gridLines.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", "rgba(139, 0, 0, 0.1)")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "2,4");
        }

        const sizeScale = d3.scaleSqrt()
            .domain(ratingExtent)
            .range([4, 20]);

        
        const colorScale = d3.scaleSequential()
            .domain(d3.extent(validData, d => d.avgFear))
            .interpolator(d3.interpolateRgb("#4a0000", "#ff1f6b")); 

        
        const strongGlow = defs.append("filter")
            .attr("id", "strong-glow")
            .attr("x", "-100%")
            .attr("y", "-100%")
            .attr("width", "300%")
            .attr("height", "300%");
        strongGlow.append("feGaussianBlur")
            .attr("stdDeviation", "8")
            .attr("result", "coloredBlur");
        const feMerge2 = strongGlow.append("feMerge");
        feMerge2.append("feMergeNode").attr("in", "coloredBlur");
        feMerge2.append("feMergeNode").attr("in", "SourceGraphic");
        
        
        const trailFilter = defs.append("filter")
            .attr("id", "trail-glow");
        trailFilter.append("feGaussianBlur")
            .attr("stdDeviation", "2")
            .attr("result", "blur");

        
        const tooltip = d3.select("body").select(".rating-tooltip");
        if (tooltip.empty()) {
            d3.select("body").append("div")
                .attr("class", "rating-tooltip")
                .style("position", "absolute")
                .style("opacity", 0)
                .style("pointer-events", "none")
                .style("background", "linear-gradient(135deg, rgba(20, 0, 0, 0.98), rgba(5, 0, 0, 0.95))")
                .style("border", "2px solid #8b0000")
                .style("border-radius", "8px")
                .style("padding", "12px 16px")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#ffe5e5")
                .style("font-size", "13px")
                .style("z-index", "10000")
                .style("max-width", "300px")
                .style("box-shadow", "0 0 20px rgba(139, 0, 0, 0.6), inset 0 0 10px rgba(0, 0, 0, 0.5)");
        }

        
        const xAxis = d3.axisBottom(xScale)
            .ticks(6)
            .tickFormat(d3.format(".2f"));
        const yAxis = d3.axisLeft(yScale)
            .ticks(8);

        const xAxisG = g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .style("color", "#ff6666");
        
        xAxisG.selectAll("text")
            .style("fill", "#ffaaaa")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "12px")
            .style("font-weight", "600");
        
        xAxisG.selectAll("line, path")
            .style("stroke", "#ff6666")
            .style("opacity", 0.8);

        const yAxisG = g.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .style("color", "#ff6666");
        
        yAxisG.selectAll("text")
            .style("fill", "#ffaaaa")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "12px")
            .style("font-weight", "600");
        
        yAxisG.selectAll("line, path")
            .style("stroke", "#ff6666")
            .style("opacity", 0.8);

        
        const xAxisLabel = data.length > 0 && data[0].impactScore !== undefined 
            ? "Horror Impact Score" 
            : "Horror Impact Score";
        
        g.append("text")
            .attr("transform", `translate(${width / 2}, ${height + 50})`)
            .style("text-anchor", "middle")
            .style("fill", "#ffaaaa")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "14px")
            .style("font-weight", "700")
            .text(xAxisLabel);

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -height / 2)
            .style("text-anchor", "middle")
            .style("fill", "#ffaaaa")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "14px")
            .style("font-weight", "700")
            .text("IMDB Rating");

        
        const allFilmNames = validData.map(d => d.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()));
        const uniqueFilms = [...new Set(allFilmNames)].sort();
        
        
        let selectedFilms = new Set(uniqueFilms); 
        
        
        const dropdownContainer = controlsContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "10px")
            .style("position", "relative");
        
        dropdownContainer.append("label")
            .style("color", "#ff4444")
            .style("font-size", "12px")
            .style("text-shadow", "0 0 4px rgba(255, 68, 68, 0.6)")
            .text("Select Films:");
        
        const dropdownWrapper = dropdownContainer.append("div")
            .style("position", "relative")
            .style("width", "280px");
        
        
        const dropdownButton = dropdownWrapper.append("div")
            .attr("id", "film-dropdown-button")
            .style("padding", "8px 12px")
            .style("background", "rgba(20, 0, 0, 0.6)")
            .style("border", "1px solid #8b0000")
            .style("border-radius", "4px")
            .style("color", "#ffe5e5")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "12px")
            .style("cursor", "pointer")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("user-select", "none")
            .on("click", function() {
                const isOpen = dropdownList.style("display") === "block";
                dropdownList.style("display", isOpen ? "none" : "block");
                if (!isOpen) {
                    searchInput.node().focus();
                }
            })
            .on("mouseover", function() {
                d3.select(this)
                    .style("border-color", "#ff4444")
                    .style("box-shadow", "0 0 8px rgba(255, 68, 68, 0.4)");
            })
            .on("mouseout", function() {
                if (dropdownList.style("display") !== "block") {
                    d3.select(this)
                        .style("border-color", "#8b0000")
                        .style("box-shadow", "none");
                }
            });
        
        dropdownButton.append("span")
            .attr("id", "film-dropdown-text")
            .text(`${selectedFilms.size} of ${uniqueFilms.length} selected`)
            .style("flex", "1");
        
        dropdownButton.append("span")
            .text("▼")
            .style("color", "#ff6666")
            .style("font-size", "10px")
            .style("margin-left", "8px");
        
        
        const dropdownList = dropdownWrapper.append("div")
            .attr("id", "film-dropdown-list")
            .style("position", "absolute")
            .style("top", "100%")
            .style("left", "0")
            .style("right", "0")
            .style("background", "rgba(20, 0, 0, 0.98)")
            .style("border", "1px solid #8b0000")
            .style("border-radius", "4px")
            .style("max-height", "400px")
            .style("overflow", "hidden")
            .style("z-index", "1000")
            .style("display", "none")
            .style("margin-top", "4px")
            .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.8)");
        
        
        const controlButtons = dropdownList.append("div")
            .style("display", "flex")
            .style("gap", "8px")
            .style("padding", "8px 12px")
            .style("border-bottom", "1px solid #8b0000")
            .style("background", "rgba(10, 0, 0, 0.8)");
        
        const selectAllBtn = controlButtons.append("button")
            .text("Select All")
            .style("flex", "1")
            .style("padding", "6px")
            .style("background", "rgba(139, 0, 0, 0.3)")
            .style("border", "1px solid #8b0000")
            .style("border-radius", "4px")
            .style("color", "#ff6666")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "11px")
            .style("cursor", "pointer")
            .on("click", function() {
                selectedFilms = new Set(uniqueFilms);
                updateDropdownText();
                renderFilmList();
                updateFilters();
            });
        
        const deselectAllBtn = controlButtons.append("button")
            .text("Deselect All")
            .style("flex", "1")
            .style("padding", "6px")
            .style("background", "rgba(139, 0, 0, 0.3)")
            .style("border", "1px solid #8b0000")
            .style("border-radius", "4px")
            .style("color", "#ff6666")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "11px")
            .style("cursor", "pointer")
            .on("click", function() {
                selectedFilms.clear();
                updateDropdownText();
                renderFilmList();
                updateFilters();
            });
        
        
        const searchInput = dropdownList.append("input")
            .attr("type", "text")
            .attr("id", "film-search-input")
            .attr("placeholder", "Type to filter films...")
            .style("width", "100%")
            .style("padding", "8px 12px")
            .style("background", "rgba(10, 0, 0, 0.8)")
            .style("border", "none")
            .style("border-bottom", "1px solid #8b0000")
            .style("color", "#ffe5e5")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", "12px")
            .style("outline", "none")
            .style("box-sizing", "border-box");
        
        
        const filmListContainer = dropdownList.append("div")
            .attr("id", "film-list-container")
            .style("max-height", "300px")
            .style("overflow-y", "auto");
        
        let filteredFilms = uniqueFilms;
        
        function updateDropdownText() {
            d3.select("#film-dropdown-text").text(
                `${selectedFilms.size} of ${uniqueFilms.length} selected`
            );
        }
        
        function renderFilmList() {
            const items = filmListContainer.selectAll(".film-item")
                .data(filteredFilms, d => d);
            
            items.exit().remove();
            
            const enter = items.enter()
                .append("div")
                .attr("class", "film-item")
                .style("padding", "8px 12px")
                .style("cursor", "pointer")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "10px")
                .style("border-bottom", "1px solid rgba(139, 0, 0, 0.2)")
                .on("mouseover", function() {
                    d3.select(this)
                        .style("background", "rgba(139, 0, 0, 0.3)");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("background", "transparent");
                });
            
            
            enter.append("input")
                .attr("type", "checkbox")
                .attr("class", "film-checkbox")
                .style("width", "16px")
                .style("height", "16px")
                .style("cursor", "pointer")
                .style("accent-color", "#8b0000")
                .on("change", function(event, film) {
                    event.stopPropagation();
                    if (this.checked) {
                        selectedFilms.add(film);
                    } else {
                        selectedFilms.delete(film);
                    }
                    updateDropdownText();
                    updateFilters();
                });
            
            
            enter.append("span")
                .attr("class", "film-name")
                .style("flex", "1")
                .style("color", "#ffe5e5")
                .style("font-family", "'Special Elite', monospace")
                .style("font-size", "12px")
                .text(d => d)
                .on("click", function(event, film) {
                    const checkbox = d3.select(this.parentNode).select(".film-checkbox").node();
                    checkbox.checked = !checkbox.checked;
                    if (checkbox.checked) {
                        selectedFilms.add(film);
                    } else {
                        selectedFilms.delete(film);
                    }
                    updateDropdownText();
                    updateFilters();
                });
            
            
            items.select(".film-checkbox")
                .property("checked", d => selectedFilms.has(d));
            
            items.select(".film-name")
                .style("color", d => selectedFilms.has(d) ? "#ffe5e5" : "#666");
            
            items.merge(enter);
        }
        
        
        renderFilmList();
        
        
        searchInput.on("input", function() {
            const query = d3.select(this).property("value").toLowerCase();
            filteredFilms = uniqueFilms.filter(film => 
                film.toLowerCase().includes(query)
            );
            renderFilmList();
        });
        
        
        d3.select("body").on("click", function(event) {
            if (!event.target.closest("#film-dropdown-button") && 
                !event.target.closest("#film-dropdown-list")) {
                dropdownList.style("display", "none");
                dropdownButton
                    .style("border-color", "#8b0000")
                    .style("box-shadow", "none");
            }
        });
        
        
        const yearExtent = d3.extent(validData, d => d.year || 0);
        if (yearExtent[0] < yearExtent[1]) {
            controlsContainer.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "10px")
                .html(`
                    <label style="color: #ff4444; font-size: 12px; text-shadow: 0 0 4px rgba(255, 68, 68, 0.6);">Year Range:</label>
                    <input type="range" id="year-min" min="${yearExtent[0]}" max="${yearExtent[1]}" value="${yearExtent[0]}" style="width: 100px;">
                    <span id="year-min-val" style="color: #ff6666; font-size: 11px; text-shadow: 0 0 4px rgba(255, 68, 68, 0.6);">${yearExtent[0]}</span>
                    <span style="color: #8b0000;">-</span>
                    <input type="range" id="year-max" min="${yearExtent[0]}" max="${yearExtent[1]}" value="${yearExtent[1]}" style="width: 100px;">
                    <span id="year-max-val" style="color: #ff6666; font-size: 11px; text-shadow: 0 0 4px rgba(255, 68, 68, 0.6);">${yearExtent[1]}</span>
                `);
        }
        
        
        controlsContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "10px")
            .html(`
                <label style="color: #ff4444; font-size: 12px; text-shadow: 0 0 4px rgba(255, 68, 68, 0.6);">Min Rating:</label>
                <input type="range" id="rating-filter" min="${yExtent[0]}" max="${yExtent[1]}" value="${yExtent[0]}" step="0.1" style="width: 100px;">
                <span id="rating-val" style="color: #ff6666; font-size: 11px; text-shadow: 0 0 4px rgba(255, 68, 68, 0.6);">${yExtent[0].toFixed(1)}</span>
            `);
        
        
        controlsContainer.append("button")
            .text("Reset Filters")
            .style("padding", "6px 12px")
            .style("background", "rgba(139, 0, 0, 0.3)")
            .style("border", "1px solid #8b0000")
            .style("color", "#ff4444")
            .style("font-family", "'Special Elite', monospace")
            .style("cursor", "pointer")
            .style("border-radius", "4px")
            .style("text-shadow", "0 0 4px rgba(255, 68, 68, 0.6)")
            .on("mouseover", function() {
                d3.select(this)
                    .style("background", "rgba(139, 0, 0, 0.5)")
                    .style("box-shadow", "0 0 10px rgba(255, 68, 68, 0.4)");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("background", "rgba(139, 0, 0, 0.3)")
                    .style("box-shadow", "none");
            })
            .on("click", () => {
                d3.select("#year-min").property("value", yearExtent[0]);
                d3.select("#year-max").property("value", yearExtent[1]);
                d3.select("#rating-filter").property("value", yExtent[0]);
                d3.select("#film-search-input").property("value", "");
                selectedFilms = new Set(uniqueFilms); 
                filteredFilms = uniqueFilms;
                updateDropdownText();
                renderFilmList();
                dropdownList.style("display", "none");
                updateFilters();
            });
        
        let filteredData = validData;
        
        function updateFilters() {
            const yearMin = +d3.select("#year-min").property("value") || yearExtent[0];
            const yearMax = +d3.select("#year-max").property("value") || yearExtent[1];
            const ratingMin = +d3.select("#rating-filter").property("value") || yExtent[0];
            
            d3.select("#year-min-val").text(yearMin);
            d3.select("#year-max-val").text(yearMax);
            d3.select("#rating-val").text(ratingMin.toFixed(1));
            
            filteredData = validData.filter(d => {
                const year = d.year || 0;
                const yearMatch = year >= yearMin && year <= yearMax;
                const ratingMatch = d.rating >= ratingMin;
                
                
                const filmDisplay = d.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                const filmMatch = selectedFilms.has(filmDisplay);
                
                return yearMatch && ratingMatch && filmMatch;
            });
            
            updateVisualization();
        }
        
        
        d3.select("#year-min").on("input", updateFilters);
        d3.select("#year-max").on("input", updateFilters);
        d3.select("#rating-filter").on("input", updateFilters);
        
        
        let highlightedFilm = null;
        
        function updateVisualization() {
            
            g.selectAll(".star-group").remove();
            g.selectAll(".blood-web").remove();
            g.selectAll(".shadow-tendril").remove();
            
            
            const nodes = filteredData.map((d, i) => ({
                id: i,
                data: d,
                x: xScale(d.impactScore),
                y: yScale(d.rating),
                radius: sizeScale(d.rating) + 4,
                fx: null,
                fy: null
            }));
            
            const simulation = d3.forceSimulation(nodes)
                .force("collision", d3.forceCollide().radius(d => d.radius + 3).strength(0.8))
                .force("x", d3.forceX(d => xScale(d.data.impactScore)).strength(0.3))
                .force("y", d3.forceY(d => yScale(d.data.rating)).strength(0.3))
                .stop();
            
            for (let i = 0; i < 60; i++) {
                simulation.tick();
            }
            
            if (nodes.length < 30) {
                nodes.forEach((d1, i) => {
                    nodes.slice(i + 1).forEach(d2 => {
                        const dist = Math.sqrt(
                            Math.pow(d1.x - d2.x, 2) +
                            Math.pow(d1.y - d2.y, 2)
                        );
                        
                        if (dist < 60 && Math.abs(d1.data.rating - d2.data.rating) < 0.8) {
                            g.append("line")
                                .attr("class", "shadow-tendril")
                                .attr("x1", d1.x)
                                .attr("y1", d1.y)
                                .attr("x2", d2.x)
                                .attr("y2", d2.y)
                                .attr("stroke", "rgba(139, 0, 0, 0.15)")
                                .attr("stroke-width", 0.5)
                                .lower();
                        }
                    });
                });
            }
            
            const starGroups = g.selectAll(".star-group")
                .data(nodes)
                .enter()
                .append("g")
                .attr("class", "star-group")
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .style("opacity", 0);
            
            
            starGroups.transition()
                .delay((d, i) => i * 10)
                .duration(600)
                .ease(d3.easeCubicOut)
                .style("opacity", 1);
            
            
            starGroups.append("circle")
                .attr("class", "outer-glow")
                .attr("r", d => d.radius)
                .attr("fill", d => colorScale(d.data.avgFear))
                .attr("opacity", 0.4)
                .style("filter", "url(#star-glow)");
            
            
            starGroups.append("circle")
                .attr("class", "middle-ring")
                .attr("r", d => sizeScale(d.data.rating) + 1.5)
                .attr("fill", "none")
                .attr("stroke", d => colorScale(d.data.avgFear))
                .attr("stroke-width", 1)
                .attr("opacity", 0.6);
            
            
            const mainStar = starGroups.append("circle")
                .attr("class", "main-star")
                .attr("r", d => sizeScale(d.data.rating))
                .attr("fill", d => colorScale(d.data.avgFear))
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .style("filter", "url(#star-glow)")
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    highlightedFilm = d.data;
                    
                    
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", sizeScale(d.data.rating) * 1.5)
                        .attr("stroke-width", 3)
                        .style("filter", "url(#strong-glow)");
                    
                    
                    
                    
                    g.selectAll(".star-group").each(function(d2) {
                        if (d2 !== d) {
                            const dist = Math.sqrt(
                                Math.pow(d.x - d2.x, 2) +
                                Math.pow(d.y - d2.y, 2)
                            );
                            if (dist < 100) {
                                d3.select(this).select(".main-star")
                                    .transition()
                                    .duration(200)
                                    .attr("opacity", 0.6);
                            }
                        }
                    });

                    const tooltip = d3.select(".rating-tooltip");
                    tooltip.html(`
                        <div style="text-align: center;">
                            <strong style="color: #ff1f6b; font-size: 16px; display: block; margin-bottom: 8px;">${d.data.film.replace(/_Unknown$/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</strong>
                            ${d.data.year ? `<div style="color: #b0ffb0; font-size: 11px; margin-bottom: 4px;">(${d.data.year})</div>` : ''}
                            <div style="color: #ffdd55; margin-bottom: 6px;">⭐ IMDB: ${d.data.rating.toFixed(1)}</div>
                            <div style="font-size: 11px; line-height: 1.6;">
                                <div>Impact Score: <strong>${d.data.impactScore.toFixed(3)}</strong></div>
                                ${d.data.peakFear > 0 ? `<div>Peak Fear: <strong>${d.data.peakFear.toFixed(2)}</strong></div>` : ''}
                                <div>Avg Fear: <strong>${d.data.avgFear.toFixed(2)}</strong></div>
                                ${d.data.signalDiversity > 0 ? `<div>Signal Diversity: <strong>${d.data.signalDiversity}</strong></div>` : ''}
                                ${d.data.transitions > 0 ? `<div>State Transitions: <strong>${d.data.transitions}</strong></div>` : ''}
                                ${d.data.signalCount > 0 ? `<div>Total Signals: <strong>${d.data.signalCount}</strong></div>` : ''}
                            </div>
                        </div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .transition()
                    .duration(150)
                    .style("opacity", 1);
                })
                .on("mousemove", function(event) {
                    const tooltip = d3.select(".rating-tooltip");
                    tooltip.style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("click", function(event, d) {
                    
                    if (highlightedFilm === d.data) {
                        highlightedFilm = null;
                        g.selectAll(".star-group").select(".main-star")
                            .transition()
                            .duration(300)
                            .attr("opacity", 1)
                            .attr("r", d => sizeScale(d.data.rating))
                            .attr("stroke-width", 1.5)
                            .style("filter", "url(#star-glow)");
                    } else {
                        highlightedFilm = d.data;
                        g.selectAll(".star-group").select(".main-star")
                            .transition()
                            .duration(300)
                            .attr("opacity", d2 => {
                                if (d2 === d) return 1;
                                const dist = Math.sqrt(
                                    Math.pow(d.x - d2.x, 2) +
                                    Math.pow(d.y - d2.y, 2)
                                );
                                return dist < 120 ? 0.4 : 0.2;
                            });
                        
                        d3.select(this)
                            .transition()
                            .duration(300)
                            .attr("r", sizeScale(d.data.rating) * 1.3)
                            .attr("stroke-width", 3)
                            .style("filter", "url(#strong-glow)");
                    }
                })
                .on("mouseout", function(event, d) {
                    if (highlightedFilm !== d.data) {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("r", sizeScale(d.data.rating))
                            .attr("stroke-width", 1.5)
                            .style("filter", "url(#star-glow)");
                        
                        
                        
                        
                        g.selectAll(".star-group").each(function(d2) {
                            if (d2 !== d && highlightedFilm !== d2.data) {
                                d3.select(this).select(".main-star")
                                    .transition()
                                    .duration(200)
                                    .attr("opacity", 1);
                            }
                        });
                        
                        d3.select(".rating-tooltip")
                            .transition()
                            .duration(200)
                            .style("opacity", 0);
                    }
                });
        }
        
        
        updateVisualization();

        
        const corrValue = calculateCorrelation(validData.map(d => ({ x: d.impactScore, y: d.rating })));
        
        if (!isNaN(corrValue) && Math.abs(corrValue) > 0.05) {
            
            const n = validData.length;
            const sumX = d3.sum(validData, d => d.impactScore);
            const sumY = d3.sum(validData, d => d.rating);
            const sumXY = d3.sum(validData, d => d.impactScore * d.rating);
            const sumXX = d3.sum(validData, d => d.impactScore * d.impactScore);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            const x1 = xExtent[0];
            const y1 = slope * x1 + intercept;
            const x2 = xExtent[1];
            const y2 = slope * x2 + intercept;
            
            g.append("line")
                .attr("x1", xScale(x1))
                .attr("y1", yScale(y1))
                .attr("x2", xScale(x2))
                .attr("y2", yScale(y2))
                .attr("stroke", "#ff1f6b")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.6)
                .style("filter", "drop-shadow(0 0 4px rgba(255, 31, 107, 0.6))");
        }

        if (!isNaN(corrValue)) {
            const corrColor = corrValue > 0.3 ? "#ff4444" : corrValue < -0.3 ? "#8b0000" : "#ff6666";
            g.append("text")
                .attr("x", width - 200)
                .attr("y", height - 20)
                .text(`Correlation: ${corrValue > 0 ? '+' : ''}${corrValue.toFixed(3)}`)
                .style("fill", corrColor)
                .style("font-family", "'Special Elite', monospace")
                .style("font-size", "13px")
                .style("font-weight", "700")
                .style("text-shadow", `0 0 8px ${corrColor}, 0 0 4px rgba(139, 0, 0, 0.8)`);
        }
    }

    function init() {
        console.log("🌌 Initializing Rating Impact Galaxy...");
        
        Promise.all([
            d3.csv(EFFECTIVENESS_URL, d3.autoType).catch(err => {
                console.error("Failed to load effectiveness data:", err);
                return [];
            }),
            d3.csv(FILM_COMPARISON_URL, d3.autoType).catch(err => {
                console.error("Failed to load film comparison data:", err);
                return [];
            }),
            d3.csv(IMDB_URL, d3.autoType).catch(err => {
                console.error("Failed to load IMDB data:", err);
                return [];
            }),
            d3.csv(HORROR_SIGNALS_URL, d3.autoType).catch(err => {
                console.error("Failed to load horror signals data:", err);
                console.log("Trying alternative path...");
                
                return d3.csv("data/cleaner_datasets/viz1_horror_signals_by_film.csv", d3.autoType).catch(() => []);
            }),
            d3.csv(FEAR_JOURNEY_URL, d3.autoType).catch(err => {
                console.error("Failed to load fear journey data:", err);
                return [];
            })
        ]).then(([effectiveness, filmComparison, imdbData, horrorSignals, fearJourney]) => {
            console.log("Data loaded:", {
                effectiveness: effectiveness?.length || 0,
                filmComparison: filmComparison?.length || 0,
                imdbData: imdbData?.length || 0,
                horrorSignals: horrorSignals?.length || 0,
                fearJourney: fearJourney?.length || 0
            });
            
            if (!filmComparison || filmComparison.length === 0) {
                console.error("No film comparison data available");
                d3.select(VIZ_SEL).append("div")
                    .style("color", "#ff1f6b")
                    .style("font-family", "'Special Elite', monospace")
                    .style("padding", "2rem")
                    .style("text-align", "center")
                    .html("⚠ Failed to load film comparison data.<br>Check console for details.");
                return;
            }
            
            if (!imdbData || imdbData.length === 0) {
                console.error("No IMDB data available");
                d3.select(VIZ_SEL).append("div")
                    .style("color", "#ff1f6b")
                    .style("font-family", "'Special Elite', monospace")
                    .style("padding", "2rem")
                    .style("text-align", "center")
                    .html("⚠ Failed to load IMDB data.<br>Check console for details.");
                return;
            }
            
            const processed = processData(effectiveness, filmComparison, imdbData, horrorSignals, fearJourney);
            
            if (processed.length === 0) {
                console.warn("No data processed - check data matching");
                d3.select(VIZ_SEL).append("div")
                    .style("color", "#ff1f6b")
                    .style("font-family", "'Special Elite', monospace")
                    .style("padding", "2rem")
                    .style("text-align", "center")
                    .html("⚠ No matching data found between film comparison and IMDB datasets.<br>Check console for details.");
                return;
            }
            
            
            const correlations = {
                score1: calculateCorrelation(processed.map(d => ({ x: d.impactScore, y: d.rating }))),
                score2: calculateCorrelation(processed.map(d => ({ x: d.impactScore2, y: d.rating }))),
                score3: calculateCorrelation(processed.map(d => ({ x: d.impactScore3, y: d.rating }))),
                peakFear: calculateCorrelation(processed.map(d => ({ x: d.peakFear, y: d.rating }))),
                avgFear: calculateCorrelation(processed.map(d => ({ x: d.avgFear, y: d.rating }))),
                diversity: calculateCorrelation(processed.map(d => ({ x: d.signalDiversity, y: d.rating }))),
                year: calculateCorrelation(processed.map(d => ({ x: d.year, y: d.rating })))
            };
            
            console.log("Correlations with rating:", correlations);
            
            
            let bestMetric = 'impactScore';
            let bestCorr = Math.abs(correlations.impactScore);
            Object.keys(correlations).forEach(key => {
                if (Math.abs(correlations[key]) > bestCorr) {
                    bestMetric = key;
                    bestCorr = Math.abs(correlations[key]);
                }
            });
            
            console.log(`Using ${bestMetric} with correlation: ${correlations[bestMetric]}`);
            
            
            if (bestMetric !== 'impactScore') {
                processed.forEach(d => {
                    if (bestMetric === 'peakFear') d.impactScore = d.peakFear;
                    else if (bestMetric === 'avgFear') d.impactScore = d.avgFear;
                    else if (bestMetric === 'diversity') d.impactScore = d.signalDiversity / 50;
                    else if (bestMetric === 'year') d.impactScore = (d.year - 1970) / 50; 
                    else if (bestMetric === 'score2') d.impactScore = d.impactScore2;
                    else if (bestMetric === 'score3') d.impactScore = d.impactScore3;
                });
            }
            
            drawGalaxy(VIZ_SEL, processed);
        }).catch(err => {
            console.error("Rating Impact Galaxy load error", err);
            console.error("Error stack:", err.stack);
            d3.select(VIZ_SEL).append("div")
                .style("color", "#ff1f6b")
                .style("font-family", "'Special Elite', monospace")
                .style("padding", "2rem")
                .style("text-align", "center")
                .html("⚠ Rating Impact Galaxy failed to load.<br>Error: " + (err.message || "Unknown error") + "<br>Check console for details.");
        });
    }
    
    function calculateCorrelation(dataPoints) {
        if (!dataPoints || dataPoints.length === 0) return 0;
        const n = dataPoints.length;
        const sumX = d3.sum(dataPoints, d => d.x);
        const sumY = d3.sum(dataPoints, d => d.y);
        const sumXY = d3.sum(dataPoints, d => d.x * d.y);
        const sumXX = d3.sum(dataPoints, d => d.x * d.x);
        const sumYY = d3.sum(dataPoints, d => d.y * d.y);
        
        const meanX = sumX / n;
        const meanY = sumY / n;
        
        const numerator = sumXY - n * meanX * meanY;
        const denominator = Math.sqrt((sumXX - n * meanX * meanX) * (sumYY - n * meanY * meanY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
})();


