// ===== CONFIGURATION =====
// Categories and audience buckets live in js/categories.js — edit them there.
const CONFIG = {
    dataPath: './data/scripts.json',
    versionRotateInterval: 15000
};

// ===== STATE =====
let state = {
    scripts: [],
    currentCategory: 'all',
    audienceFilters: JSON.parse(localStorage.getItem('scriptAudienceFilters')) || [],
    searchQuery: '',
    currentView: localStorage.getItem('scriptViewMode') || '1',
    sortOrder: localStorage.getItem('scriptSortOrder') || 'newest',
    showFavoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem('scriptFavorites')) || [],
    isLoading: true,
    error: null,

    versionRotation: {},
};

// ===== DOM ELEMENTS =====
const elements = {
    scriptsGrid: document.getElementById('scriptsGrid'),
    searchInput: document.getElementById('searchInput'),
    navList: document.getElementById('navList'),
    navItems: [],
    audienceFilters: document.getElementById('audienceFilters'),
    audienceButtons: [],
    sectionTitle: document.getElementById('sectionTitle'),
    resultsCount: document.getElementById('resultsCount'),
    viewToggle: document.getElementById('viewToggle'),
    viewBtns: document.querySelectorAll('.view-btn'),
    sortSelect: document.getElementById('sortSelect'),
    favoritesToggle: document.getElementById('favoritesToggle'),
    randomBtn: document.getElementById('randomBtn')
};

// ===== FAVORITES FUNCTIONS =====
function getFavorites() {
    return state.favorites;
}

function saveFavorites() {
    localStorage.setItem('scriptFavorites', JSON.stringify(state.favorites));
}

function isFavorite(scriptId) {
    return state.favorites.includes(scriptId);
}

function toggleFavorite(scriptId) {
    const index = state.favorites.indexOf(scriptId);
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        state.favorites.push(scriptId);
    }
    saveFavorites();
    renderScripts();
}

// ===== SORTING FUNCTIONS =====
function sortScripts(scripts) {
    const sorted = [...scripts];
    
    switch (state.sortOrder) {
        case 'newest':
            sorted.sort((a, b) => {
                const dateA = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
                const dateB = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
                return dateB - dateA;
            });
            break;
        case 'oldest':
            sorted.sort((a, b) => {
                const dateA = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
                const dateB = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
                return dateA - dateB;
            });
            break;
        case 'alphabetical':
            sorted.sort((a, b) => {
                
                const titleA = a.hasVersions ? a.versions[0].title : a.title;
                const titleB = b.hasVersions ? b.versions[0].title : b.title;
                return titleA.localeCompare(titleB);
            });
            break;
    }
    
    return sorted;
}

// ===== RANDOM SCRIPT =====
function goToRandomScript() {
    const scriptsWithContent = state.scripts.filter(s => {
       
        if (s.patreonOnly) return true;
        
        if (s.hasVersions) {
            return s.versions.some(v => v.contentFile && v.contentFile !== '');
        }
        return s.contentFile && s.contentFile !== '';
    });
    
    if (scriptsWithContent.length > 0) {
        const randomIndex = Math.floor(Math.random() * scriptsWithContent.length);
        const randomScript = scriptsWithContent[randomIndex];
        
      
        if (randomScript.hasVersions) {
            const randomVersionIndex = Math.floor(Math.random() * randomScript.versions.length);
            const randomVersion = randomScript.versions[randomVersionIndex];
            window.location.href = `reader.html?id=${randomScript.id}&version=${randomVersion.versionId}`;
        } else {
            window.location.href = `reader.html?id=${randomScript.id}`;
        }
    }
}

// ===== DATA LOADING =====
async function loadScripts() {
    try {
        state.isLoading = true;
        state.error = null;
        renderLoadingState();

        const response = await fetch(CONFIG.dataPath);
        
        if (!response.ok) {
            throw new Error(`Failed to load scripts: ${response.status}`);
        }

        const data = await response.json();
        state.scripts = data.scripts || [];
        state.isLoading = false;

        updateCounts();
        renderScripts();

    } catch (error) {
        console.error('Error loading scripts:', error);
        state.error = error.message;
        state.isLoading = false;
        renderErrorState();
    }
}

// ===== FILTERING =====
function filterScripts() {
    let filtered = [...state.scripts];

    filtered = filtered.filter(script => !script.hidden);

    // Primary filter: a script appears under EVERY category it belongs to.
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(script =>
            getScriptCategories(script).includes(state.currentCategory)
        );
    }

    // Secondary filter: audience buttons (X4M / X4F / A4A), matched as OR.
    if (state.audienceFilters.length > 0) {
        filtered = filtered.filter(script => scriptMatchesAudiences(script, state.audienceFilters));
    }

    if (state.showFavoritesOnly) {
        filtered = filtered.filter(script => isFavorite(script.id));
    }

    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(script => {
            const categoryMatch = getScriptCategoryLabels(script)
                .some(label => label.toLowerCase().includes(query));

            if (script.hasVersions) {
                return categoryMatch || script.versions.some(version => {
                    const titleMatch = (version.title || '').toLowerCase().includes(query);
                    const tagsMatch = (version.tags || []).some(tag => tag.toLowerCase().includes(query));
                    const synopsisMatch = (version.synopsis || '').toLowerCase().includes(query);
                    return titleMatch || tagsMatch || synopsisMatch;
                });
            } else {
                const titleMatch = (script.title || '').toLowerCase().includes(query);
                const tagsMatch = (script.tags || []).some(tag => tag.toLowerCase().includes(query));
                const synopsisMatch = (script.synopsis || '').toLowerCase().includes(query);
                return titleMatch || tagsMatch || synopsisMatch || categoryMatch;
            }
        });
    }


    filtered = sortScripts(filtered);

    return filtered;
}

// ===== SIDEBAR RENDERING =====
// The category list and audience buttons are built from js/categories.js so
// there is only ever one place to edit when the taxonomy changes.
function renderNav() {
    if (!elements.navList) return;

    const items = [ALL_CATEGORY, ...CATEGORY_DEFS];
    elements.navList.innerHTML = items.map(cat => `
        <li class="nav-item${cat.slug === state.currentCategory ? ' active' : ''}"
            data-category="${cat.slug}" role="button" tabindex="0">
            <span class="nav-icon">${cat.icon}</span>
            <span class="nav-label">${escapeHtml(cat.label)}</span>
            <span class="nav-count" id="count-${cat.slug}">0</span>
        </li>
    `).join('');

    elements.navItems = elements.navList.querySelectorAll('.nav-item');
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => setActiveCategory(item.dataset.category));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveCategory(item.dataset.category);
            }
        });
    });
}

function renderAudienceFilters() {
    if (!elements.audienceFilters) return;

    elements.audienceFilters.innerHTML = AUDIENCE_DEFS.map(aud => `
        <button class="audience-btn${state.audienceFilters.includes(aud.key) ? ' active' : ''}"
                data-audience="${aud.key}" title="${escapeHtml(aud.title)}"
                aria-pressed="${state.audienceFilters.includes(aud.key)}">
            <span class="audience-label">${escapeHtml(aud.label)}</span>
            <span class="audience-count" id="audience-count-${aud.key}">0</span>
        </button>
    `).join('');

    elements.audienceButtons = elements.audienceFilters.querySelectorAll('.audience-btn');
    elements.audienceButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleAudienceFilter(btn.dataset.audience));
    });
}

function toggleAudienceFilter(key) {
    const idx = state.audienceFilters.indexOf(key);
    if (idx > -1) {
        state.audienceFilters.splice(idx, 1);
    } else {
        state.audienceFilters.push(key);
    }
    localStorage.setItem('scriptAudienceFilters', JSON.stringify(state.audienceFilters));

    elements.audienceButtons.forEach(btn => {
        const on = state.audienceFilters.includes(btn.dataset.audience);
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on);
    });

    updateSectionTitle();
    renderScripts();
}

function clearAudienceFilters() {
    state.audienceFilters = [];
    localStorage.setItem('scriptAudienceFilters', '[]');
    renderAudienceFilters();
    updateSectionTitle();
    renderScripts();
}

// ===== COUNT UPDATES =====
function updateCounts() {
    const visibleScripts = state.scripts.filter(s => !s.hidden);

    // Category counts respect the active audience filter, so the sidebar
    // never promises results a click won't deliver.
    const pool = state.audienceFilters.length
        ? visibleScripts.filter(s => scriptMatchesAudiences(s, state.audienceFilters))
        : visibleScripts;

    const allEl = document.getElementById('count-all');
    if (allEl) allEl.textContent = pool.length;

    CATEGORY_DEFS.forEach(cat => {
        const element = document.getElementById(`count-${cat.slug}`);
        if (!element) return;
        element.textContent = pool.filter(s => getScriptCategories(s).includes(cat.slug)).length;
    });

    // Audience counts respect the active category the same way.
    const audiencePool = state.currentCategory === 'all'
        ? visibleScripts
        : visibleScripts.filter(s => getScriptCategories(s).includes(state.currentCategory));

    AUDIENCE_DEFS.forEach(aud => {
        const element = document.getElementById(`audience-count-${aud.key}`);
        if (!element) return;
        element.textContent = audiencePool.filter(s => scriptMatchesAudiences(s, [aud.key])).length;
    });
}

// ===== RENDERING =====
function renderLoadingState() {
    elements.scriptsGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading scripts from the cosmos...</p>
        </div>
    `;
}

function renderErrorState() {
    elements.scriptsGrid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3 class="error-title">Failed to Load Scripts</h3>
            <p>${state.error}</p>
            <button class="retry-button" onclick="loadScripts()">Try Again</button>
        </div>
    `;
}

function renderEmptyState() {
    const audienceHint = state.audienceFilters.length
        ? `<p><button class="retry-button" onclick="clearAudienceFilters()">Clear audience filter</button></p>`
        : '';

    return `
        <div class="empty-state">
            <div class="empty-icon">🔭</div>
            <h3 class="empty-title">No Scripts Found</h3>
            <p>Try adjusting your search, category, or audience filter.</p>
            ${audienceHint}
        </div>
    `;
}

// ===== VERSION ROTATION FUNCTIONS =====
function initVersionRotation(scriptId, totalVersions) {
    
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    state.versionRotation[scriptId] = {
        currentIndex: 0,
        intervalId: setInterval(() => {
            rotateVersion(scriptId, 1, totalVersions);
        }, CONFIG.versionRotateInterval)
    };
}

function rotateVersion(scriptId, direction, totalVersions) {
    if (!state.versionRotation[scriptId]) {
        state.versionRotation[scriptId] = { currentIndex: 0, intervalId: null };
    }
    
    let newIndex = state.versionRotation[scriptId].currentIndex + direction;
    
    if (newIndex >= totalVersions) newIndex = 0;
    if (newIndex < 0) newIndex = totalVersions - 1;
    
    state.versionRotation[scriptId].currentIndex = newIndex;
    
    updateVersionedCardDisplay(scriptId, newIndex);
}

function updateVersionedCardDisplay(scriptId, versionIndex) {
    const card = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (!card) return;
    
    const allVersions = card.querySelectorAll('.version-content');
    allVersions.forEach((v, idx) => {
        v.classList.toggle('active', idx === versionIndex);
    });
    
    const dots = card.querySelectorAll('.version-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === versionIndex);
    });

    requestAnimationFrame(() => {
        card.querySelectorAll('.version-content.active .card-synopsis-container').forEach(container => {
            const synopsis = container.querySelector('.card-synopsis');
            const btn = container.querySelector('.synopsis-expand-btn');
            if (!synopsis || !btn) return;
            synopsis.classList.remove('expanded');
            btn.textContent = 'Show more';
            btn.style.display = synopsis.scrollHeight > synopsis.clientHeight + 1 ? 'inline-block' : 'none';
        });
    });
}

function goToVersion(scriptId, versionIndex, totalVersions) {
    
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    state.versionRotation[scriptId] = {
        currentIndex: versionIndex,
        intervalId: setInterval(() => {
            rotateVersion(scriptId, 1, totalVersions);
        }, CONFIG.versionRotateInterval)
    };
    
    updateVersionedCardDisplay(scriptId, versionIndex);
}

function prevVersion(event, scriptId, totalVersions) {
    event.stopPropagation();
    
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    rotateVersion(scriptId, -1, totalVersions);
    
    state.versionRotation[scriptId].intervalId = setInterval(() => {
        rotateVersion(scriptId, 1, totalVersions);
    }, CONFIG.versionRotateInterval);
}

function nextVersion(event, scriptId, totalVersions) {
    event.stopPropagation();
    
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    rotateVersion(scriptId, 1, totalVersions);
    
    state.versionRotation[scriptId].intervalId = setInterval(() => {
        rotateVersion(scriptId, 1, totalVersions);
    }, CONFIG.versionRotateInterval);
}

function cleanupVersionRotation() {
    Object.keys(state.versionRotation).forEach(scriptId => {
        if (state.versionRotation[scriptId]?.intervalId) {
            clearInterval(state.versionRotation[scriptId].intervalId);
        }
    });
    state.versionRotation = {};
}

// ===== CARD CREATION =====
function createScriptCard(script, index) {

    if (script.hasVersions && script.versions && script.versions.length > 0) {
        return createVersionedScriptCard(script, index);
    }
    
    return createStandardScriptCard(script, index);
}

// Renders one chip per category the script belongs to. Chips are clickable
// and jump the sidebar to that category.
function generateCategoryChipsHTML(script) {
    const slugs = getScriptCategories(script);
    if (slugs.length === 0) return '';

    return `<div class="card-categories">` + slugs.map(slug => `
        <span class="card-category" data-category="${slug}"
              onclick="event.stopPropagation(); setActiveCategory('${slug}');"
              title="Show all ${escapeHtml(getCategoryLabel(slug))} scripts">
            <span class="card-category-icon">${getCategoryIcon(slug)}</span>${escapeHtml(getCategoryLabel(slug))}
        </span>
    `).join('') + `</div>`;
}

function createStandardScriptCard(script, index) {
    const icon = getScriptIcon(script);
    const categoryChips = generateCategoryChipsHTML(script);

    const isFav = isFavorite(script.id);
    const favClass = isFav ? 'favorited' : '';
    const favFill = isFav ? 'var(--nova-pink)' : 'none';

    const favoriteBtn = `
        <button class="card-favorite-btn ${favClass}" onclick="event.stopPropagation(); toggleFavorite(${script.id});" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${favFill}" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    `;

    let artistCreditHTML = '';
    if (script.artist) {
        if (script.artistLink) {
            artistCreditHTML = `<div class="card-artist-credit">Art by <a href="${escapeHtml(script.artistLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${escapeHtml(script.artist)}</a></div>`;
        } else {
            artistCreditHTML = `<div class="card-artist-credit">Art by ${escapeHtml(script.artist)}</div>`;
        }
    }

    const imageHTML = script.image 
        ? `<div class="card-image-container">
               ${favoriteBtn}
               <img src="${script.image}" alt="${escapeHtml(script.title)}" class="card-image" loading="lazy">
               ${artistCreditHTML}
           </div>`
        : `<div class="card-image-container">
               ${favoriteBtn}
               <div class="card-placeholder-image">${icon}</div>
               ${artistCreditHTML}
           </div>`;

    const tagsHTML = generateTagsHTML(script.tags);

    const buttonsHTML = generateButtonsHTML(script);

    const hasContent = script.contentFile && script.contentFile !== '';
    const isPatreonOnly = script.patreonOnly === true;
    
    let clickHandler = '';
    if (isPatreonOnly || hasContent) {
        clickHandler = `onclick="window.location.href='reader.html?id=${script.id}';"`;
    }

    return `
        <article class="script-card" style="animation-delay: ${index * 0.05}s" ${clickHandler}>
            ${imageHTML}
            <div class="card-content">
                ${categoryChips}
                <h3 class="card-title">${escapeHtml(script.title)}</h3>
                <div class="card-tags">
                    ${tagsHTML}
                </div>
                <div class="card-synopsis-container">
                    <p class="card-synopsis">${escapeHtml(script.synopsis)}</p>
                    <button class="synopsis-expand-btn" onclick="event.stopPropagation(); toggleSynopsis(this);" style="display: none;">Show more</button>
                </div>
                ${buttonsHTML}
            </div>
        </article>
    `;
}

function createVersionedScriptCard(script, index) {
    const icon = getScriptIcon(script);
    const totalVersions = script.versions.length;
    const categoryChips = generateCategoryChipsHTML(script);

    const isFav = isFavorite(script.id);
    const favClass = isFav ? 'favorited' : '';
    const favFill = isFav ? 'var(--nova-pink)' : 'none';

    const favoriteBtn = `
        <button class="card-favorite-btn ${favClass}" onclick="event.stopPropagation(); toggleFavorite(${script.id});" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${favFill}" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    `;

    const arrowsHTML = `
        <button class="version-arrow version-arrow-prev" onclick="event.stopPropagation(); prevVersion(event, ${script.id}, ${totalVersions})" title="Previous version">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <button class="version-arrow version-arrow-next" onclick="event.stopPropagation(); nextVersion(event, ${script.id}, ${totalVersions})" title="Next version">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    `;

    let dotsHTML = '<div class="version-dots">';
    script.versions.forEach((version, vIdx) => {
        const activeClass = vIdx === 0 ? 'active' : '';
        dotsHTML += `<button class="version-dot ${activeClass}" onclick="event.stopPropagation(); goToVersion(${script.id}, ${vIdx}, ${totalVersions})" title="${escapeHtml(version.versionLabel)}"></button>`;
    });
    dotsHTML += '</div>';

    let versionContentsHTML = '';
    script.versions.forEach((version, vIdx) => {
        const isActive = vIdx === 0 ? 'active' : '';
        
        const versionImage = version.image || script.image;
        const imageHTML = versionImage 
            ? `<img src="${versionImage}" alt="${escapeHtml(version.title)}" class="card-image" loading="lazy">`
            : `<div class="card-placeholder-image">${icon}</div>`;
        
        const artist = version.artist || script.artist;
        const artistLink = version.artistLink || script.artistLink;
        let artistCreditHTML = '';
        if (artist) {
            if (artistLink) {
                artistCreditHTML = `<div class="card-artist-credit">Art by <a href="${escapeHtml(artistLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${escapeHtml(artist)}</a></div>`;
            } else {
                artistCreditHTML = `<div class="card-artist-credit">Art by ${escapeHtml(artist)}</div>`;
            }
        }

        const tagsHTML = generateTagsHTML(version.tags);

        const buttonsHTML = generateVersionButtonsHTML(script, version);

        const synopsisHTML = `
            <div class="card-synopsis-container">
                <p class="card-synopsis">${escapeHtml(version.synopsis)}</p>
                <button class="synopsis-expand-btn" onclick="event.stopPropagation(); toggleSynopsis(this);" style="display: none;">Show more</button>
            </div>
        `;

        versionContentsHTML += `
            <div class="version-content ${isActive}" data-version-index="${vIdx}">
                <div class="card-image-container">
                    ${favoriteBtn}
                    ${imageHTML}
                    ${artistCreditHTML}
                    <div class="version-label">${escapeHtml(version.versionLabel)}</div>
                </div>
                <div class="card-content">
                    ${categoryChips}
                    <h3 class="card-title">${escapeHtml(version.title)}</h3>
                    <div class="card-tags">
                        ${tagsHTML}
                    </div>
                    ${synopsisHTML}
                    ${buttonsHTML}
                </div>
            </div>
        `;
    });

    setTimeout(() => initVersionRotation(script.id, totalVersions), 100);

    return `
        <article class="script-card versioned-card" data-script-id="${script.id}" style="animation-delay: ${index * 0.05}s">
            ${arrowsHTML}
            ${versionContentsHTML}
            ${dotsHTML}
        </article>
    `;
}

function generateTagsHTML(tags) {
    const maxVisibleTags = 5;
    const totalTags = tags.length;
    const hasMoreTags = totalTags > maxVisibleTags;
    
    let tagsHTML = tags
        .map((tag, idx) => {
            const hiddenClass = idx >= maxVisibleTags ? 'hidden' : '';
            return `<span class="tag ${hiddenClass}" data-tag="${escapeHtml(tag)}" onclick="event.stopPropagation(); handleTagClick('${escapeHtml(tag)}');">${escapeHtml(tag)}</span>`;
        })
        .join('');
    
    if (hasMoreTags) {
        const hiddenCount = totalTags - maxVisibleTags;
        tagsHTML += `<button class="tag-expand-btn" onclick="event.stopPropagation(); toggleTags(this);" data-expanded="false">+${hiddenCount} more</button>`;
    }

    return tagsHTML;
}

function generateButtonsHTML(script) {
    let buttonsHTML = '<div class="card-buttons">';
    const isPatreonOnly = script.patreonOnly === true;
    const hasContent = script.contentFile && script.contentFile !== '';
    
    if (isPatreonOnly) {
        buttonsHTML += `
            <a href="reader.html?id=${script.id}" class="card-link card-link-primary" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read Now
            </a>
        `;
    } else if (hasContent) {
        buttonsHTML += `
            <a href="reader.html?id=${script.id}" class="card-link card-link-primary" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Now
            </a>
        `;
    }
    
    if (isPatreonOnly && script.patreonLink) {
        buttonsHTML += `
            <a href="${escapeHtml(script.patreonLink)}" class="card-link card-link-patreon" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003"/>
                </svg>
                Unlock on Patreon
            </a>
        `;
    }
    
    if (!isPatreonOnly && script.scriptbinLink && script.scriptbinLink !== '' && script.scriptbinLink !== '#') {
        buttonsHTML += `
            <a href="${escapeHtml(script.scriptbinLink)}" class="card-link card-link-secondary" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Scriptbin
            </a>
        `;
    }
    
    if (!isPatreonOnly && !hasContent && 
        (!script.scriptbinLink || script.scriptbinLink === '' || script.scriptbinLink === '#')) {
        buttonsHTML += `
            <span class="card-link card-link-disabled">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Coming Soon
            </span>
        `;
    }
    
    buttonsHTML += '</div>';
    return buttonsHTML;
}

function generateVersionButtonsHTML(script, version) {
    let buttonsHTML = '<div class="card-buttons">';
    const isPatreonOnly = script.patreonOnly === true;
    const hasContent = version.contentFile && version.contentFile !== '';
    
    if (isPatreonOnly) {
        buttonsHTML += `
            <a href="reader.html?id=${script.id}&version=${version.versionId}" class="card-link card-link-primary" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read Now
            </a>
        `;
    } else if (hasContent) {
        buttonsHTML += `
            <a href="reader.html?id=${script.id}&version=${version.versionId}" class="card-link card-link-primary" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Now
            </a>
        `;
    }
    
    if (isPatreonOnly && script.patreonLink) {
        buttonsHTML += `
            <a href="${escapeHtml(script.patreonLink)}" class="card-link card-link-patreon" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003"/>
                </svg>
                Unlock on Patreon
            </a>
        `;
    }
    
    const scriptbinLink = version.scriptbinLink || script.scriptbinLink;
    if (!isPatreonOnly && scriptbinLink && scriptbinLink !== '' && scriptbinLink !== '#') {
        buttonsHTML += `
            <a href="${escapeHtml(scriptbinLink)}" class="card-link card-link-secondary" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Scriptbin
            </a>
        `;
    }
    
    if (!isPatreonOnly && !hasContent && 
        (!scriptbinLink || scriptbinLink === '' || scriptbinLink === '#')) {
        buttonsHTML += `
            <span class="card-link card-link-disabled">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Coming Soon
            </span>
        `;
    }
    
    buttonsHTML += '</div>';
    return buttonsHTML;
}

function toggleTags(btn) {
    const tagsContainer = btn.parentElement;
    const hiddenTags = tagsContainer.querySelectorAll('.tag.hidden');
    const isExpanded = btn.dataset.expanded === 'true';
    
    if (isExpanded) {
        const allTags = tagsContainer.querySelectorAll('.tag');
        allTags.forEach((tag, idx) => {
            if (idx >= 5) {
                tag.classList.add('hidden');
            }
        });
        const hiddenCount = allTags.length - 5;
        btn.textContent = `+${hiddenCount} more`;
        btn.dataset.expanded = 'false';
    } else {
        hiddenTags.forEach(tag => {
            tag.classList.remove('hidden');
        });
        btn.textContent = 'Show less';
        btn.dataset.expanded = 'true';
    }
}

function handleTagClick(tag) {
    elements.searchInput.value = tag;
    state.searchQuery = tag;
    renderScripts();
}

function renderScripts() {

    cleanupVersionRotation();

    updateCounts();

    const filtered = filterScripts();

    if (filtered.length === 0) {
        elements.scriptsGrid.innerHTML = renderEmptyState();
    } else {
        elements.scriptsGrid.innerHTML = filtered
            .map((script, index) => createScriptCard(script, index))
            .join('');
    }

    const countText = filtered.length === 1 ? '1 script' : `${filtered.length} scripts`;
    elements.resultsCount.textContent = `Showing ${countText}`;

    requestAnimationFrame(checkSynopsisOverflow);
}

function toggleSynopsis(btn) {
    const container = btn.closest('.card-synopsis-container');
    const synopsis = container.querySelector('.card-synopsis');
    const isExpanded = synopsis.classList.toggle('expanded');
    btn.textContent = isExpanded ? 'Show less' : 'Show more';
}

function checkSynopsisOverflow() {
    document.querySelectorAll('.card-synopsis-container').forEach(container => {
        const synopsis = container.querySelector('.card-synopsis');
        const btn = container.querySelector('.synopsis-expand-btn');
        if (!synopsis || !btn) return;
        synopsis.classList.remove('expanded');
        btn.textContent = 'Show more';
        btn.style.display = synopsis.scrollHeight > synopsis.clientHeight + 1 ? 'inline-block' : 'none';
    });
}

// ===== CATEGORY SWITCHING =====
function setActiveCategory(category) {
    const slug = category === 'all' ? 'all' : (normalizeCategorySlug(category) || 'all');
    state.currentCategory = slug;

    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.category === slug);
    });

    updateSectionTitle();
    renderScripts();
}

// Title reads e.g. "Fantasy Scripts" or "Fantasy Scripts · X4M".
function updateSectionTitle() {
    if (!elements.sectionTitle) return;

    const base = state.currentCategory === 'all'
        ? 'All Scripts'
        : `${getCategoryLabel(state.currentCategory) || 'All'} Scripts`;

    const audienceLabels = AUDIENCE_DEFS
        .filter(a => state.audienceFilters.includes(a.key))
        .map(a => a.label);

    elements.sectionTitle.textContent = audienceLabels.length
        ? `${base} · ${audienceLabels.join(' / ')}`
        : base;
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Nav item and audience button listeners are attached in renderNav() /
    // renderAudienceFilters(), since those elements are built at runtime.

    const debouncedSearch = debounce((value) => {
        state.searchQuery = value;
        renderScripts();
    }, 200);

    elements.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.searchInput.value = '';
            state.searchQuery = '';
            renderScripts();
        }
    });
    
    if (elements.viewToggle) {
        elements.viewToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-btn');
            if (btn) {
                const view = btn.dataset.view;
                setView(view);
            }
        });
    }

    if (elements.sortSelect) {
        elements.sortSelect.value = state.sortOrder;
        elements.sortSelect.addEventListener('change', (e) => {
            state.sortOrder = e.target.value;
            localStorage.setItem('scriptSortOrder', state.sortOrder);
            renderScripts();
        });
    }

    if (elements.favoritesToggle) {
        elements.favoritesToggle.addEventListener('click', () => {
            state.showFavoritesOnly = !state.showFavoritesOnly;
            elements.favoritesToggle.classList.toggle('active', state.showFavoritesOnly);
            renderScripts();
        });
    }

    if (elements.randomBtn) {
        elements.randomBtn.addEventListener('click', goToRandomScript);
    }
}

// ===== VIEW TOGGLE =====
function setView(view) {
    state.currentView = view;
    localStorage.setItem('scriptViewMode', view);
    
    elements.viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    elements.scriptsGrid.className = `scripts-grid view-${view}`;
}

function initializeView() {
    const savedView = state.currentView;
    setView(savedView);
}

// ===== PATREON ACCESS FUNCTIONS =====
let currentPatreonScriptId = null;
let currentPatreonVersionId = null;

function openPatreonModal(scriptId, title) {
    currentPatreonScriptId = scriptId;
    currentPatreonVersionId = null;
    
    const savedKey = localStorage.getItem(`patreon_key_${scriptId}`);
    if (savedKey) {
        window.location.href = `reader.html?id=${scriptId}&key=${encodeURIComponent(savedKey)}`;
        return;
    }
    
    const modal = document.getElementById('patreonModal');
    const titleEl = document.getElementById('patreonModalTitle');
    const input = document.getElementById('patreonKeyInput');
    const errorEl = document.getElementById('patreonModalError');
    
    if (modal && titleEl && input) {
        titleEl.textContent = title;
        input.value = '';
        errorEl.style.display = 'none';
        modal.classList.add('active');
        input.focus();
    }
}

function openPatreonModalVersioned(scriptId, title, versionId) {
    currentPatreonScriptId = scriptId;
    currentPatreonVersionId = versionId;
    
    const savedKey = localStorage.getItem(`patreon_key_${scriptId}`);
    if (savedKey) {
        window.location.href = `reader.html?id=${scriptId}&version=${versionId}&key=${encodeURIComponent(savedKey)}`;
        return;
    }
    
    const modal = document.getElementById('patreonModal');
    const titleEl = document.getElementById('patreonModalTitle');
    const input = document.getElementById('patreonKeyInput');
    const errorEl = document.getElementById('patreonModalError');
    
    if (modal && titleEl && input) {
        titleEl.textContent = title;
        input.value = '';
        errorEl.style.display = 'none';
        modal.classList.add('active');
        input.focus();
    }
}

function closePatreonModal() {
    const modal = document.getElementById('patreonModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentPatreonScriptId = null;
    currentPatreonVersionId = null;
}

function submitPatreonKey() {
    const input = document.getElementById('patreonKeyInput');
    const errorEl = document.getElementById('patreonModalError');
    
    if (!input || !currentPatreonScriptId) return;
    
    const key = input.value.trim();
    if (!key) {
        errorEl.textContent = 'Please enter a password.';
        errorEl.style.display = 'block';
        return;
    }
    
    localStorage.setItem(`patreon_key_${currentPatreonScriptId}`, key);
    
    let url = `reader.html?id=${currentPatreonScriptId}&key=${encodeURIComponent(key)}`;
    if (currentPatreonVersionId) {
        url += `&version=${currentPatreonVersionId}`;
    }
    window.location.href = url;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('patreonModal')?.classList.contains('active')) {
        submitPatreonKey();
    }
    if (e.key === 'Escape' && document.getElementById('patreonModal')?.classList.contains('active')) {
        closePatreonModal();
    }
});

// ===== DEEP LINKING =====
// Lets reader.html chips link back here as index.html?category=fantasy,
// and supports index.html?audience=4m for shareable filtered views.
function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);

    const cat = params.get('category');
    if (cat) {
        const slug = cat === 'all' ? 'all' : normalizeCategorySlug(cat);
        if (slug) state.currentCategory = slug;
    }

    const aud = params.get('audience');
    if (aud) {
        const keys = aud.split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => AUDIENCE_DEFS.some(a => a.key === k));
        if (keys.length) state.audienceFilters = keys;
    }

    const q = params.get('q');
    if (q && elements.searchInput) {
        elements.searchInput.value = q;
        state.searchQuery = q;
    }
}

// ===== INITIALIZATION =====
function initialize() {
    applyUrlFilters();
    renderNav();
    renderAudienceFilters();
    initializeEventListeners();
    initializeView();
    updateSectionTitle();
    loadScripts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
