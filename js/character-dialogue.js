/**
 * Character Dialogue System
 * ==========================
 * Parses character definitions from markdown files and applies
 * color styling to dialogue lines.
 * 
 * Usage in .md files:
 * <!-- CHARACTERS
 * MEDUSA: #39FF14
 * POSEIDON: #26f7fd
 * ATHENA: #ffd700
 * -->
 * 
 * Then use **NAME:** for dialogue lines (case-insensitive matching)
 */

const CharacterDialogue = {
    // Default color palette for characters without defined colors
    defaultColors: [
        '#ff6b9d', // Pink
        '#8a6bff', // Purple
        '#6bffc8', // Mint
        '#ffb86b', // Orange
        '#6bcfff', // Sky blue
        '#ff6b6b', // Coral
        '#c86bff', // Violet
        '#6bff8a', // Lime
    ],

    // Track if colors are enabled
    colorsEnabled: true,

    /**
     * Initialize from localStorage
     */
    init() {
        const saved = localStorage.getItem('characterColorsEnabled');
        this.colorsEnabled = saved === null ? true : saved === 'true';
    },

    /**
     * Toggle colors on/off
     */
    toggle(enabled) {
        this.colorsEnabled = enabled;
        localStorage.setItem('characterColorsEnabled', enabled);
    },

    /**
     * Parse character definitions from markdown content
     * Returns { characters: { name: color }, content: cleanedContent }
     */
    parseCharacters(markdown) {
        const characters = {};
        let content = markdown;

        // Look for character definition block
        // Format: <!-- CHARACTERS\nName: #color\nName2: #color2\n-->
        const charBlockRegex = /<!--\s*CHARACTERS\s*\n([\s\S]*?)-->/i;
        const match = markdown.match(charBlockRegex);

        if (match) {
            const charDefinitions = match[1].trim();
            const lines = charDefinitions.split('\n');

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                // Parse "Name: #color" or "Name: color"
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const name = trimmed.substring(0, colonIndex).trim();
                    let color = trimmed.substring(colonIndex + 1).trim();

                    // Ensure color has # prefix if it's a hex color
                    if (color && !color.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(color)) {
                        color = '#' + color;
                    }

                    if (name && color) {
                        characters[name] = color;
                    }
                }
            });

            // Remove the character block from content
            content = markdown.replace(charBlockRegex, '').trim();
        }

        return { characters, content };
    },

    /**
     * Auto-detect characters from dialogue patterns
     * Supports both **NAME:** and **[Name]:** formats
     */
    autoDetectCharacters(markdown) {
        const characters = new Set();
        
        // Match **NAME:** pattern (with or without brackets)
        // Supports: **MEDUSA:** or **[Medusa]:**
        const dialogueRegex = /\*\*\[?([^\]:\*]+)\]?:\*\*/g;
        let match;

        while ((match = dialogueRegex.exec(markdown)) !== null) {
            characters.add(match[1].trim());
        }

        // Assign default colors
        const result = {};
        let colorIndex = 0;
        characters.forEach(name => {
            result[name] = this.defaultColors[colorIndex % this.defaultColors.length];
            colorIndex++;
        });

        return result;
    },

    /**
     * Apply character colors to rendered HTML
     * Call this AFTER marked.js has converted markdown to HTML
     */
    applyColors(htmlContent, characters, hideNames = true) {
        if (!characters || Object.keys(characters).length === 0) {
            return htmlContent;
        }

        let result = htmlContent;

        // For each character, wrap their dialogue lines with colored spans
        Object.entries(characters).forEach(([name, color]) => {
            // Escape special regex characters in name
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Pattern to match: <strong>NAME:</strong> or <strong>[Name]:</strong>
            // At the start of a paragraph
            const patterns = [
                // **NAME:** format (no brackets)
                new RegExp(
                    `(<p>\\s*)(<strong>${escapedName}:</strong>)`,
                    'gi'
                ),
                // **[Name]:** format (with brackets)
                new RegExp(
                    `(<p>\\s*)(<strong>\\[${escapedName}\\]:</strong>)`,
                    'gi'
                )
            ];

            patterns.forEach(pattern => {
                if (hideNames && this.colorsEnabled) {
                    // Hide the name, just show colored line
                    result = result.replace(pattern, 
                        `$1<span class="character-line" data-character="${name}" style="--character-color: ${color}"><span class="character-name-hidden">$2</span>`
                    );
                } else {
                    // Show the name with color
                    result = result.replace(pattern, 
                        `$1<span class="character-line colors-off" data-character="${name}" style="--character-color: ${color}"><span class="character-name-visible">$2</span>`
                    );
                }
            });
        });

        // Close any unclosed character-line spans at paragraph end
        result = result.replace(
            /(<span class="character-line[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/gi,
            '$1$2</span>$3'
        );

        return result;
    },

    /**
     * Generate CSS for character legend/key
     */
    generateLegendHTML(characters) {
        if (!characters || Object.keys(characters).length === 0) {
            return '';
        }

        const items = Object.entries(characters).map(([name, color]) => `
            <div class="character-legend-item">
                <span class="character-legend-color" style="background-color: ${color}; box-shadow: 0 0 10px ${color};"></span>
                <span class="character-legend-name">${name}</span>
            </div>
        `).join('');

        return `
            <div class="character-legend" id="characterLegend">
                <div class="character-legend-header">
                    <div class="character-legend-title">Characters</div>
                    <button class="character-toggle-btn ${this.colorsEnabled ? '' : 'disabled'}" id="characterToggleBtn" onclick="toggleCharacterColors()" title="Toggle character colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span id="colorToggleText">${this.colorsEnabled ? 'Colors On' : 'Colors Off'}</span>
                    </button>
                </div>
                <div class="character-legend-items">
                    ${items}
                </div>
            </div>
        `;
    },

    /**
     * Process markdown content - main entry point
     * Returns { html: processedHTML, characters: characterMap, legend: legendHTML, rawHtml: unprocessedHTML }
     */
    process(markdown, markedInstance) {
        // Parse character definitions
        let { characters, content } = this.parseCharacters(markdown);

        // If no characters defined, try auto-detection
        if (Object.keys(characters).length === 0) {
            characters = this.autoDetectCharacters(content);
        }

        // Convert markdown to HTML (without character processing)
        const rawHTML = markedInstance ? markedInstance.parse(content) : content;

        // Apply character colors based on current state
        const coloredHTML = this.applyColors(rawHTML, characters, this.colorsEnabled);

        // Generate legend
        const legend = Object.keys(characters).length > 1 
            ? this.generateLegendHTML(characters) 
            : '';

        return {
            html: coloredHTML,
            rawHtml: rawHTML,
            characters,
            legend,
            hasMultipleCharacters: Object.keys(characters).length > 1
        };
    },

    /**
     * Re-process already parsed HTML with current color settings
     */
    reprocess(rawHtml, characters) {
        return this.applyColors(rawHtml, characters, this.colorsEnabled);
    }
};

// Initialize on load
CharacterDialogue.init();

// Global toggle function for the button
function toggleCharacterColors() {
    const newState = !CharacterDialogue.colorsEnabled;
    CharacterDialogue.toggle(newState);
    
    // Update button text
    const toggleText = document.getElementById('colorToggleText');
    if (toggleText) {
        toggleText.textContent = newState ? 'Colors On' : 'Colors Off';
    }
    
    // Update toggle button appearance
    const toggleBtn = document.getElementById('characterToggleBtn');
    if (toggleBtn) {
        toggleBtn.classList.toggle('disabled', !newState);
    }
    
    // Re-render content with new settings
    if (window.reprocessCharacterContent) {
        window.reprocessCharacterContent();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterDialogue;
}
