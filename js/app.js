/**
 * Script Masterlist - Main Application
 * =====================================
 * This file handles loading scripts from the JSON data file,
 * filtering, searching, and rendering the UI.
 * 
 * Supports versioned scripts with auto-rotating cards.
 */

// ===== CONFIGURATION =====
const CONFIG = {
    dataPath: './data/scripts.json',
    categories: {
        all: { title: 'All Scripts', icon: '✨' },
        fantasy: { title: 'Fantasy Scripts', icon: '🐉' },
        scifi: { title: 'Sci-Fi Scripts', icon: '🚀' },
        daytoday: { title: 'Day-to-Day Scripts', icon: '☕' },
        warhammer: { title: 'Warhammer Scripts', icon: '⚔️' }
    },
    versionRotateInterval: 15000 // 15 seconds for auto-rotate
};

// ===== STATE =====
let state = {
    scripts: [],
    currentCategory: 'all',
    searchQuery: '',
    currentView: localStorage.getItem('scriptViewMode') || '1',
    sortOrder: localStorage.getItem('scriptSortOrder') || 'newest',
    showFavoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem('scriptFavorites')) || [],
    isLoading: true,
    error: null,
    // Version rotation state
    versionRotation: {}, // { scriptId: { currentIndex: 0, intervalId: null } }
};

// ===== DOM ELEMENTS =====
const elements = {
    scriptsGrid: document.getElementById('scriptsGrid'),
    searchInput: document.getElementById('searchInput'),
    navItems: document.querySelectorAll('.nav-item'),
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
                // For versioned scripts, use first version's title
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
        // Patreon scripts always have content (from API)
        if (s.patreonOnly) return true;
        
        if (s.hasVersions) {
            return s.versions.some(v => v.contentFile && v.contentFile !== '');
        }
        return s.contentFile && s.contentFile !== '';
    });
    
    if (scriptsWithContent.length > 0) {
        const randomIndex = Math.floor(Math.random() * scriptsWithContent.length);
        const randomScript = scriptsWithContent[randomIndex];
        
        // For versioned scripts, pick a random version
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

    // Filter out hidden scripts (sequels)
    filtered = filtered.filter(script => !script.hidden);

    // Filter by category
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(script => script.category === state.currentCategory);
    }

    // Filter by favorites only
    if (state.showFavoritesOnly) {
        filtered = filtered.filter(script => isFavorite(script.id));
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(script => {
            if (script.hasVersions) {
                // Search across all versions
                return script.versions.some(version => {
                    const titleMatch = version.title.toLowerCase().includes(query);
                    const tagsMatch = version.tags.some(tag => tag.toLowerCase().includes(query));
                    const synopsisMatch = version.synopsis.toLowerCase().includes(query);
                    return titleMatch || tagsMatch || synopsisMatch;
                }) || script.category.toLowerCase().includes(query);
            } else {
                const titleMatch = script.title.toLowerCase().includes(query);
                const tagsMatch = script.tags.some(tag => tag.toLowerCase().includes(query));
                const synopsisMatch = script.synopsis.toLowerCase().includes(query);
                const categoryMatch = script.category.toLowerCase().includes(query);
                return titleMatch || tagsMatch || synopsisMatch || categoryMatch;
            }
        });
    }

    // Apply sorting
    filtered = sortScripts(filtered);

    return filtered;
}

// ===== COUNT UPDATES =====
function updateCounts() {
    // Only count non-hidden scripts
    const visibleScripts = state.scripts.filter(s => !s.hidden);
    document.getElementById('count-all').textContent = visibleScripts.length;
    
    const categories = ['fantasy', 'scifi', 'daytoday', 'warhammer'];
    categories.forEach(cat => {
        const count = visibleScripts.filter(s => s.category === cat).length;
        const element = document.getElementById(`count-${cat}`);
        if (element) {
            element.textContent = count;
        }
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
    return `
        <div class="empty-state">
            <div class="empty-icon">🔭</div>
            <h3 class="empty-title">No Scripts Found</h3>
            <p>Try adjusting your search or selecting a different category.</p>
        </div>
    `;
}

// ===== VERSION ROTATION FUNCTIONS =====
function initVersionRotation(scriptId, totalVersions) {
    // Clear any existing interval
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
    
    // Wrap around
    if (newIndex >= totalVersions) newIndex = 0;
    if (newIndex < 0) newIndex = totalVersions - 1;
    
    state.versionRotation[scriptId].currentIndex = newIndex;
    
    // Update the card display
    updateVersionedCardDisplay(scriptId, newIndex);
}

function updateVersionedCardDisplay(scriptId, versionIndex) {
    const card = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (!card) return;
    
    // Hide all version contents
    const allVersions = card.querySelectorAll('.version-content');
    allVersions.forEach((v, idx) => {
        v.classList.toggle('active', idx === versionIndex);
    });
    
    // Update dots
    const dots = card.querySelectorAll('.version-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === versionIndex);
    });
}

function goToVersion(scriptId, versionIndex, totalVersions) {
    // Reset the auto-rotate timer
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
    
    // Reset the auto-rotate timer
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    rotateVersion(scriptId, -1, totalVersions);
    
    // Restart auto-rotate
    state.versionRotation[scriptId].intervalId = setInterval(() => {
        rotateVersion(scriptId, 1, totalVersions);
    }, CONFIG.versionRotateInterval);
}

function nextVersion(event, scriptId, totalVersions) {
    event.stopPropagation();
    
    // Reset the auto-rotate timer
    if (state.versionRotation[scriptId]?.intervalId) {
        clearInterval(state.versionRotation[scriptId].intervalId);
    }
    
    rotateVersion(scriptId, 1, totalVersions);
    
    // Restart auto-rotate
    state.versionRotation[scriptId].intervalId = setInterval(() => {
        rotateVersion(scriptId, 1, totalVersions);
    }, CONFIG.versionRotateInterval);
}

// Clean up intervals when re-rendering
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
    // Handle versioned scripts
    if (script.hasVersions && script.versions && script.versions.length > 0) {
        return createVersionedScriptCard(script, index);
    }
    
    return createStandardScriptCard(script, index);
}

function createStandardScriptCard(script, index) {
    const categoryConfig = CONFIG.categories[script.category] || CONFIG.categories.all;
    const icon = categoryConfig.icon;
    
    // Format category display name
    const categoryDisplay = script.category === 'daytoday' 
        ? 'Day-to-Day' 
        : script.category.charAt(0).toUpperCase() + script.category.slice(1);

    // Check if favorited
    const isFav = isFavorite(script.id);
    const favClass = isFav ? 'favorited' : '';
    const favFill = isFav ? 'var(--nova-pink)' : 'none';

    // Favorite button HTML
    const favoriteBtn = `
        <button class="card-favorite-btn ${favClass}" onclick="event.stopPropagation(); toggleFavorite(${script.id});" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${favFill}" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    `;

    // Handle artist credit
    let artistCreditHTML = '';
    if (script.artist) {
        if (script.artistLink) {
            artistCreditHTML = `<div class="card-artist-credit">Art by <a href="${escapeHtml(script.artistLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${escapeHtml(script.artist)}</a></div>`;
        } else {
            artistCreditHTML = `<div class="card-artist-credit">Art by ${escapeHtml(script.artist)}</div>`;
        }
    }

    // Handle image
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

    // Generate tags HTML
    const tagsHTML = generateTagsHTML(script.tags);

    // Build action buttons
    const buttonsHTML = generateButtonsHTML(script);

    // Determine click destination
    const hasContent = script.contentFile && script.contentFile !== '';
    const isPatreonOnly = script.patreonOnly === true;
    
    // Patreon scripts are always clickable (content comes from API, not local file)
    // Non-Patreon scripts need a contentFile to be clickable
    let clickHandler = '';
    if (isPatreonOnly) {
        clickHandler = `onclick="openPatreonModal(${script.id}, '${escapeHtml(script.title).replace(/'/g, "\\'")}');"`;
    } else if (hasContent) {
        clickHandler = `onclick="window.location.href='reader.html?id=${script.id}';"`;
    }

    return `
        <article class="script-card" style="animation-delay: ${index * 0.05}s" ${clickHandler}>
            ${imageHTML}
            <div class="card-content">
                <span class="card-category">${categoryDisplay}</span>
                <h3 class="card-title">${escapeHtml(script.title)}</h3>
                <div class="card-tags">
                    ${tagsHTML}
                </div>
                <p class="card-synopsis">${escapeHtml(script.synopsis)}</p>
                ${buttonsHTML}
            </div>
        </article>
    `;
}

function createVersionedScriptCard(script, index) {
    const categoryConfig = CONFIG.categories[script.category] || CONFIG.categories.all;
    const icon = categoryConfig.icon;
    const totalVersions = script.versions.length;
    
    // Format category display name
    const categoryDisplay = script.category === 'daytoday' 
        ? 'Day-to-Day' 
        : script.category.charAt(0).toUpperCase() + script.category.slice(1);

    // Check if favorited
    const isFav = isFavorite(script.id);
    const favClass = isFav ? 'favorited' : '';
    const favFill = isFav ? 'var(--nova-pink)' : 'none';

    // Favorite button HTML (shared across versions)
    const favoriteBtn = `
        <button class="card-favorite-btn ${favClass}" onclick="event.stopPropagation(); toggleFavorite(${script.id});" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${favFill}" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    `;

    // Artist credit (use script-level if not in version)
    let artistCreditHTML = '';
    if (script.artist) {
        if (script.artistLink) {
            artistCreditHTML = `<div class="card-artist-credit">Art by <a href="${escapeHtml(script.artistLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${escapeHtml(script.artist)}</a></div>`;
        } else {
            artistCreditHTML = `<div class="card-artist-credit">Art by ${escapeHtml(script.artist)}</div>`;
        }
    }

    // Generate version contents
    let versionContentsHTML = '';
    script.versions.forEach((version, vIdx) => {
        const isActive = vIdx === 0 ? 'active' : '';
        
        // Version-specific image
        const versionImage = version.image || script.image;
        const imageHTML = versionImage 
            ? `<img src="${versionImage}" alt="${escapeHtml(version.title)}" class="card-image" loading="lazy">`
            : `<div class="card-placeholder-image">${icon}</div>`;

        // Version-specific tags
        const tagsHTML = generateTagsHTML(version.tags);

        // Version-specific buttons
        const buttonsHTML = generateVersionButtonsHTML(script, version);

        versionContentsHTML += `
            <div class="version-content ${isActive}" data-version-index="${vIdx}">
                <div class="card-image-container">
                    ${favoriteBtn}
                    ${imageHTML}
                    ${artistCreditHTML}
                    <div class="version-label">${escapeHtml(version.versionLabel)}</div>
                </div>
                <div class="card-content">
                    <span class="card-category">${categoryDisplay}</span>
                    <h3 class="card-title">${escapeHtml(version.title)}</h3>
                    <div class="card-tags">
                        ${tagsHTML}
                    </div>
                    <p class="card-synopsis">${escapeHtml(version.synopsis)}</p>
                    ${buttonsHTML}
                </div>
            </div>
        `;
    });

    // Version navigation arrows
    const arrowsHTML = `
        <button class="version-arrow version-arrow-prev" onclick="prevVersion(event, ${script.id}, ${totalVersions})" title="Previous version">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <button class="version-arrow version-arrow-next" onclick="nextVersion(event, ${script.id}, ${totalVersions})" title="Next version">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    `;

    // Version dots
    let dotsHTML = '<div class="version-dots">';
    script.versions.forEach((version, vIdx) => {
        const activeClass = vIdx === 0 ? 'active' : '';
        dotsHTML += `<button class="version-dot ${activeClass}" onclick="event.stopPropagation(); goToVersion(${script.id}, ${vIdx}, ${totalVersions})" title="${escapeHtml(version.versionLabel)}"></button>`;
    });
    dotsHTML += '</div>';

    // Initialize rotation after render
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
    
    // "Read Now" button
    // Patreon scripts always get a button (content comes from API)
    // Non-Patreon scripts need a contentFile
    if (isPatreonOnly) {
        buttonsHTML += `
            <button class="card-link card-link-primary" onclick="event.stopPropagation(); openPatreonModal(${script.id}, '${escapeHtml(script.title)}');">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read Now
            </button>
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
    
    // "Unlock on Patreon" button
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
    
    // "Read on Scriptbin" button
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
    
    // Coming soon state (only for non-Patreon scripts without content)
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
    
    // "Read Now" button with version parameter
    // Patreon scripts always get a button (content comes from API)
    // Non-Patreon scripts need a contentFile
    if (isPatreonOnly) {
        buttonsHTML += `
            <button class="card-link card-link-primary" onclick="event.stopPropagation(); openPatreonModalVersioned(${script.id}, '${escapeHtml(version.title)}', '${version.versionId}');">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read Now
            </button>
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
    
    // "Unlock on Patreon" button
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
    
    // "Read on Scriptbin" button (version-specific or script-level)
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
    
    // Coming soon state (only for non-Patreon scripts without content)
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

// Toggle tags visibility
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

// Handle tag click for search
function handleTagClick(tag) {
    elements.searchInput.value = tag;
    state.searchQuery = tag;
    renderScripts();
}

function renderScripts() {
    // Cleanup existing version rotations
    cleanupVersionRotation();
    
    const filtered = filterScripts();
    
    if (filtered.length === 0) {
        elements.scriptsGrid.innerHTML = renderEmptyState();
    } else {
        elements.scriptsGrid.innerHTML = filtered
            .map((script, index) => createScriptCard(script, index))
            .join('');
    }

    // Update results count
    const countText = filtered.length === 1 ? '1 script' : `${filtered.length} scripts`;
    elements.resultsCount.textContent = `Showing ${countText}`;
}

// ===== CATEGORY SWITCHING =====
function setActiveCategory(category) {
    state.currentCategory = category;
    
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });
    
    const categoryConfig = CONFIG.categories[category];
    elements.sectionTitle.textContent = categoryConfig ? categoryConfig.title : 'All Scripts';
    
    renderScripts();
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
    // Category navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            setActiveCategory(item.dataset.category);
        });
    });

    // Search input with debouncing
    const debouncedSearch = debounce((value) => {
        state.searchQuery = value;
        renderScripts();
    }, 200);

    elements.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    // Clear search on Escape key
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.searchInput.value = '';
            state.searchQuery = '';
            renderScripts();
        }
    });

    // View toggle buttons
    if (elements.viewToggle) {
        elements.viewToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-btn');
            if (btn) {
                const view = btn.dataset.view;
                setView(view);
            }
        });
    }

    // Sort select
    if (elements.sortSelect) {
        elements.sortSelect.value = state.sortOrder;
        elements.sortSelect.addEventListener('change', (e) => {
            state.sortOrder = e.target.value;
            localStorage.setItem('scriptSortOrder', state.sortOrder);
            renderScripts();
        });
    }

    // Favorites toggle
    if (elements.favoritesToggle) {
        elements.favoritesToggle.addEventListener('click', () => {
            state.showFavoritesOnly = !state.showFavoritesOnly;
            elements.favoritesToggle.classList.toggle('active', state.showFavoritesOnly);
            renderScripts();
        });
    }

    // Random script button
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

// Handle Enter key in password input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('patreonModal')?.classList.contains('active')) {
        submitPatreonKey();
    }
    if (e.key === 'Escape' && document.getElementById('patreonModal')?.classList.contains('active')) {
        closePatreonModal();
    }
});

// ===== INITIALIZATION =====
function initialize() {
    initializeEventListeners();
    initializeView();
    loadScripts();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
