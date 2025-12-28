/**
 * Script Masterlist - Main Application
 * =====================================
 * This file handles loading scripts from the JSON data file,
 * filtering, searching, and rendering the UI.
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
    }
};

// ===== STATE =====
let state = {
    scripts: [],
    currentCategory: 'all',
    searchQuery: '',
    isLoading: true,
    error: null
};

// ===== DOM ELEMENTS =====
const elements = {
    scriptsGrid: document.getElementById('scriptsGrid'),
    searchInput: document.getElementById('searchInput'),
    navItems: document.querySelectorAll('.nav-item'),
    sectionTitle: document.getElementById('sectionTitle'),
    resultsCount: document.getElementById('resultsCount')
};

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

    // Filter by category
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(script => script.category === state.currentCategory);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(script => {
            const titleMatch = script.title.toLowerCase().includes(query);
            const tagsMatch = script.tags.some(tag => tag.toLowerCase().includes(query));
            const synopsisMatch = script.synopsis.toLowerCase().includes(query);
            const categoryMatch = script.category.toLowerCase().includes(query);
            return titleMatch || tagsMatch || synopsisMatch || categoryMatch;
        });
    }

    return filtered;
}

// ===== COUNT UPDATES =====
function updateCounts() {
    document.getElementById('count-all').textContent = state.scripts.length;
    
    const categories = ['fantasy', 'scifi', 'daytoday', 'warhammer'];
    categories.forEach(cat => {
        const count = state.scripts.filter(s => s.category === cat).length;
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

function createScriptCard(script, index) {
    const categoryConfig = CONFIG.categories[script.category] || CONFIG.categories.all;
    const icon = categoryConfig.icon;
    
    // Format category display name
    const categoryDisplay = script.category === 'daytoday' 
        ? 'Day-to-Day' 
        : script.category.charAt(0).toUpperCase() + script.category.slice(1);

    // Handle artist credit
    let artistCreditHTML = '';
    if (script.artist) {
        if (script.artistLink) {
            artistCreditHTML = `<div class="card-artist-credit">Art by <a href="${escapeHtml(script.artistLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(script.artist)}</a></div>`;
        } else {
            artistCreditHTML = `<div class="card-artist-credit">Art by ${escapeHtml(script.artist)}</div>`;
        }
    }

    // Handle image (use placeholder if no image provided)
    const imageHTML = script.image 
        ? `<div class="card-image-container">
               <img src="${script.image}" alt="${escapeHtml(script.title)}" class="card-image" loading="lazy">
               ${artistCreditHTML}
           </div>`
        : `<div class="card-image-container">
               <div class="card-placeholder-image">${icon}</div>
               ${artistCreditHTML}
           </div>`;

    // Generate tags HTML
    const tagsHTML = script.tags
        .map(tag => `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`)
        .join('');

    // Build action buttons
    let buttonsHTML = '<div class="card-buttons">';
    
    // "Read Now" button - only show if contentFile exists
    if (script.contentFile && script.contentFile !== '') {
        buttonsHTML += `
            <a href="reader.html?id=${script.id}" class="card-link card-link-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Now
            </a>
        `;
    }
    
    // "Read on Scriptbin" button - only show if scriptbinLink exists
    if (script.scriptbinLink && script.scriptbinLink !== '' && script.scriptbinLink !== '#') {
        buttonsHTML += `
            <a href="${escapeHtml(script.scriptbinLink)}" class="card-link card-link-secondary" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Scriptbin
            </a>
        `;
    }
    
    // If neither button is available, show a "coming soon" state
    if ((!script.contentFile || script.contentFile === '') && 
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

    return `
        <article class="script-card" style="animation-delay: ${index * 0.05}s">
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

function renderScripts() {
    const filtered = filterScripts();
    
    if (filtered.length === 0) {
        elements.scriptsGrid.innerHTML = renderEmptyState();
    } else {
        elements.scriptsGrid.innerHTML = filtered
            .map((script, index) => createScriptCard(script, index))
            .join('');
        
        // Add click handlers for tags
        attachTagClickHandlers();
    }

    // Update results count
    const countText = filtered.length === 1 ? '1 script' : `${filtered.length} scripts`;
    elements.resultsCount.textContent = `Showing ${countText}`;
}

// ===== TAG CLICK HANDLING =====
function attachTagClickHandlers() {
    const tags = document.querySelectorAll('.tag');
    tags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            const tagValue = tag.dataset.tag;
            elements.searchInput.value = tagValue;
            state.searchQuery = tagValue;
            renderScripts();
        });
    });
}

// ===== CATEGORY SWITCHING =====
function setActiveCategory(category) {
    state.currentCategory = category;
    
    // Update nav item active state
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });
    
    // Update section title
    const categoryConfig = CONFIG.categories[category];
    elements.sectionTitle.textContent = categoryConfig ? categoryConfig.title : 'All Scripts';
    
    // Re-render scripts
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
}

// ===== INITIALIZATION =====
function initialize() {
    initializeEventListeners();
    loadScripts();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
