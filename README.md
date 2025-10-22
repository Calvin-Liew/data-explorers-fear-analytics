# The Anatomy of Fear: Horror Film Analytics

A narrative data visualization exploring how horror films engineer terror through pacing, language, and emotional manipulation. Built with D3.js.

## Overview

This project analyzes 129 horror film screenplays to understand:

- How fear builds across scenes within films
- Which horror signals appear most frequently vs. most effectively
- The relationship between fear and tension
- When fear peaks occur across iconic horror films
- Which types of horror dominate across films

## Key Findings

1. **Fear Builds in Waves**: Horror films orchestrate fear in rhythmic patterns, with peaks typically occurring in the final third.

2. **Quality Over Quantity**: Rare but powerful signals (like "scream") have far stronger emotional impact than common ones (like "night").

3. **Tension > Fear**: Most films maintain higher tension than fear scores—the anticipation of terror is more powerful than terror itself.

4. **Strategic Timing**: The best horror saves its strongest reveals for the end, following consistent patterns across films.

## Project Structure

```
data-explorers-fear-analytics/
├── index.html              # Main HTML file with narrative structure
├── css/
│   └── style.css          # Horror-themed styling
├── js/
│   ├── main.js            # Main controller and data loading
│   ├── fearJourney.js     # Fear progression line chart
│   ├── effectiveness.js   # Frequency vs. impact bubble chart
│   ├── filmComparison.js  # Fear vs. tension scatter plot
│   ├── categories.js      # Category comparison bar chart
│   └── signalGrid.js      # Interactive signal cards
└── data/
    └── cleaner_datasets/
        ├── viz1_horror_signals_by_film.csv
        ├── viz2a_tension_journey.csv
        ├── viz2b_fear_journey.csv
        ├── viz3_horror_effectiveness.csv
        ├── viz4_film_comparison.csv
        └── viz5_horror_categories.csv
```

## Technologies

- **D3.js v7**: Data visualization and DOM manipulation
- **Scrollama**: Scroll-driven storytelling interactions
- **Vanilla JavaScript**: No framework dependencies
- **CSS Grid & Flexbox**: Responsive layout

## Features

### 1. Scrollytelling Narrative

Interactive scroll-driven story that guides users through insights about horror film patterns.

### 2. Five Main Visualizations

#### Fear Journey (Hook)

Multi-line chart showing how fear intensity changes across eight iconic horror films (Alien, Friday the 13th, Get Out, Halloween, Jaws, Psycho, Saw, Scream). Highlights early hooks, quiet middles, and final crescendos.

#### Signal Effectiveness (Rising Insight 1)

Bubble chart comparing frequency vs. emotional impact of horror signals. Demonstrates that "scream" (1,187 occurrences) has 2.3x the impact of "night" (3,694 occurrences).

#### Film Comparison (Rising Insight 2)

Scatter plot showing relationship between average fear and tension across films. Bubble size represents horror signal count, color shows dialogue ratio.

#### Horror Categories (Main Message)

Bar chart showing five categories of horror elements:

- **Atmospheric** (night, dark, shadow): Most frequent, moderate impact
- **Violence** (blood, knife, death): High impact
- **Emotional** (fear, scream, panic): Highest impact per occurrence
- **Supernatural** (ghost, demon, curse): Lower frequency
- **Sound** (scream, creak, whisper): High impact, low frequency

#### Signal Grid (Explore Section)

Interactive card grid showing detailed statistics for top 10 horror signals, including impact scores, occurrences, and mini-charts.

### 3. Interactive Features

- Hover tooltips with detailed statistics
- Animated transitions during scroll
- Dynamic highlighting based on narrative context
- Responsive design for all screen sizes

## Setup & Usage

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/calvinliew/data-explorers-fear-analytics.git
   cd data-explorers-fear-analytics
   ```

2. **Start a local server**

   Using Python 3:

   ```bash
   python -m http.server 8000
   ```

   Using Node.js:

   ```bash
   npx http-server
   ```

   Using PHP:

   ```bash
   php -S localhost:8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

**Note**: You must use a local server (not just opening `index.html` directly) because D3.js needs to load CSV files via HTTP requests.

### GitHub Pages Deployment

1. Push to GitHub
2. Go to repository Settings > Pages
3. Select branch `main` and folder `/root`
4. Your site will be published at `https://[username].github.io/data-explorers-fear-analytics/`

## Data Sources

### Original Data

- **Raw Screenplays**: 129 horror film scripts from IMDb
- **AI Analysis**: Scene-level analysis using structured prompts to extract:
  - Dialogue and action statistics
  - Emotional intensity (fear, tension, sentiment)
  - Horror vocabulary (207 tracked terms)

### Processed Datasets

1. **viz2b_fear_journey.csv**: Fear levels at 10% intervals for 8 films
2. **viz3_horror_effectiveness.csv**: Impact scores for each horror signal
3. **viz4_film_comparison.csv**: Aggregate statistics per film
4. **viz5_horror_categories.csv**: Category-level totals

Full data processing pipeline documented in project materials.

## Team

- **Calvin Liew** (Team Leader, Data Visualist)
- **Yichen Fan** (Data Transformer)
- **Yansong Zhu** (Data Transformer)
- **Olivia Doerrstein** (Data Visualist)
- **Mehmet Gunenc** (Data Transformer)
- **Fanke Qin** (Data Visualist)

**Course**: CSC316 - Data Visualization  
**Institution**: University of Toronto  
**Year**: 2024-2025

## Design Decisions

### Visual Encoding

- **Color**: Red/blood color palette for horror theme, sequential scales for intensity
- **Size**: Bubble size represents frequency or scene count
- **Position**: X/Y axes encode primary quantitative variables
- **Animation**: Scroll-triggered transitions guide attention

### Narrative Structure

Follows the four-act data storytelling framework:

1. **Hook**: Immediate engagement with fear journey
2. **Rising Insights**: Challenge assumptions about frequency
3. **Main Message**: Reveal universal patterns
4. **Solution**: Actionable framework for understanding horror

### Accessibility

- High contrast text (WCAG AA compliant)
- Hover tooltips for detailed information
- Responsive breakpoints for mobile/tablet/desktop
- Semantic HTML structure

## Browser Compatibility

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

Requires JavaScript enabled and modern CSS support (Grid, Flexbox).

## Future Enhancements

- [ ] Add film selection dropdown for fear journey
- [ ] Implement data filtering by decade/subgenre
- [ ] Add sound design to complement visuals
- [ ] Export visualizations as PNG/SVG
- [ ] Mobile gesture controls for scrollytelling
- [ ] Comparative view across multiple films simultaneously

## License

This project is for educational purposes as part of CSC316 coursework.

## Acknowledgments

- D3.js community for excellent documentation
- Scrollama.js for scroll interaction framework
- IMDb for screenplay sources
- Course staff and TAs for guidance

---

**Contact**: calvin.liew@mail.utoronto.ca

**Live Demo**: [Coming soon]
