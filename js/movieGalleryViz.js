function createMovieGalleryViz(selector, data) {
    "use strict";
  
    const container = d3.select(selector);
    const controls = d3.select('.gallery-controls');
    const scrollLeftBtn = d3.select('#scroll-left');
    const scrollRightBtn = d3.select('#scroll-right');
  
    // --- 1. 初始化筛选器 ---
    function populateFilters() {
      // A. Genre Filter
      const genres = new Set();
      data.forEach(d => {
        if (d.Genre) {
          d.Genre.split(',').forEach(g => genres.add(g.trim()));
        }
      });
      const genreFilter = controls.select('#genre-filter');
      genreFilter.append('option').attr('value', 'all').text('All Genres');
      Array.from(genres).sort().forEach(genre => {
        genreFilter.append('option').attr('value', genre).text(genre);
      });
  
      // B. Decade Filter
      const decades = new Set();
      data.forEach(d => {
        const year = parseInt(d.Year, 10);
        if (!isNaN(year)) {
          const decade = Math.floor(year / 10) * 10;
          decades.add(decade);
        }
      });
      const decadeFilter = controls.select('#decade-filter');
      decadeFilter.append('option').attr('value', 'all').text('All Decades');
      Array.from(decades).sort((a, b) => b - a).forEach(decade => {
        decadeFilter.append('option').attr('value', decade).text(`${decade}s`);
      });
  
      // C. Rating Filter
      const ratingFilter = controls.select('#rating-filter');
      ratingFilter.append('option').attr('value', 'all').text('Any Rating');
      [8, 7, 6, 5].forEach(rating => {
          ratingFilter.append('option').attr('value', rating).text(`${rating}.0+`);
      });
    }
  
    // --- 2. 更新可视化的核心函数 ---
    function update() {
      const selectedGenre = controls.select('#genre-filter').property('value');
      const selectedDecade = controls.select('#decade-filter').property('value');
      const selectedRating = controls.select('#rating-filter').property('value');
  
      const filteredData = data.filter(d => {
        const genreMatch = selectedGenre === 'all' || (d.Genre && d.Genre.includes(selectedGenre));
        
        const year = parseInt(d.Year, 10);
        const decadeMatch = selectedDecade === 'all' || (!isNaN(year) && Math.floor(year / 10) * 10 == selectedDecade);
        
        const rating = parseFloat(d.Rating);
        const ratingMatch = selectedRating === 'all' || (!isNaN(rating) && rating >= selectedRating);
  
        return genreMatch && decadeMatch && ratingMatch;
      });
  
      // D3 Data Join for smooth updates
      container.selectAll(".movie-poster-card")
        .data(filteredData, d => d.Title + d.Year) // Use a key for object constancy
        .join(
          enter => enter.append("div")
            .attr("class", "movie-poster-card")
            .style("opacity", 0)
            .style("transform", "scale(0.8)")
            .call(createCardContent) // Helper to create card internals
            .on("click", (event, d) => showModal(d))
            .transition().duration(500)
              .style("opacity", 1)
              .style("transform", "scale(1)"),
          update => update, // No changes for updating elements
          exit => exit.transition().duration(300)
            .style("opacity", 0)
            .style("transform", "scale(0.8)")
            .remove()
        );
    }
  
    // --- 3. 辅助函数：创建卡片内容 ---
    function createCardContent(selection) {
      selection.each(function(d) {
        const card = d3.select(this);
        card.html(''); // Clear previous content
        
        card.append("img")
          .attr("src", d.Poster)
          .attr("alt", d.Title)
          .on("error", function () {
            d3.select(this).remove();
            card.append("div").attr("class", "placeholder-text").text(d.Title);
          });
        
        card.append("div").attr("class", "movie-poster-overlay");
      });
    }
    
    // --- 4. 滚动按钮事件 ---
    scrollLeftBtn.on('click', () => {
      const scrollAmount = container.node().clientWidth * 0.8;
      container.node().scrollLeft -= scrollAmount;
    });
  
    scrollRightBtn.on('click', () => {
      const scrollAmount = container.node().clientWidth * 0.8;
      container.node().scrollLeft += scrollAmount;
    });
  
  
    // --- 5. 事件监听器 ---
    controls.selectAll('select').on('change', update);
    controls.select('#reset-filters').on('click', () => {
      controls.selectAll('select').property('value', 'all');
      update();
    });
  
  
    // --- 6. Modal 逻辑 (与你提供的代码基本相同) ---
    const modal = d3.select("body").append("div").attr("id", "movie-detail-modal").style("display", "none");
    const modalContent = modal.append("div").attr("class", "modal-content");
    const closeModalButton = modal.append("span").attr("class", "close-button").html("&times;");
  
    function showModal(d) {
      modalContent.html(`
          <img src="${d.Poster}" alt="${d.Title}" class="modal-poster">
          <div class="modal-info">
              <h2>${d.Title} (${parseInt(d.Year)})</h2>
              <div class="modal-meta">
                  <span>${d.Certificate || 'N/A'}</span>
                  <span>${d.Duration || '?'} min</span>
                  <span>⭐ ${d.Rating || 'N/A'}</span>
                  ${d.Metascore ? `<span><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Metacritic.svg/1200px-Metacritic.svg.png" class="metascore-icon"> ${d.Metascore}</span>` : ''}
              </div>
              <p class="genre"><strong>Genre:</strong> ${d.Genre || 'Unknown'}</p>
              <p class="director"><strong>Director:</strong> ${d.Director || 'Unknown'}</p>
              <p class="cast"><strong>Cast:</strong> ${d.Cast || 'Unknown'}</p>
              <p class="description">${d.Description || 'No description available.'}</p>
              <div class="review-section">
                  <h4>"${d['Review Title'] || 'Review'}"</h4>
                  <p class="review-text">"${(d.Review || '').substring(0, 400)}..."</p>
              </div>
          </div>
      `);
      modal.style("display", "flex");
      setTimeout(() => modal.classed("visible", true), 10);
    }
    function hideModal() {
      modal.classed("visible", false);
      setTimeout(() => modal.style("display", "none"), 300);
    }
    closeModalButton.on("click", hideModal);
    modal.on("click", function(event) {
      if (event.target === this) hideModal();
    });
  
    // --- 7. 初始调用 ---
    populateFilters();
    update(); // 首次加载时显示所有电影
  
    console.log("🎬 Horizontal Movie Gallery with Filters created.");
    return {};
  }