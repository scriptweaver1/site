/**
 * Character Dialogue System
 * ==========================
 * Parses character definitions from markdown files and applies
 * color styling to dialogue lines.
 * 
 * Usage in .md files:
 * <!-- CHARACTERS
 * Sasha: #ff6b9d
 * Mika: #8a6bff
 * Luna: #6bffc8
 * -->
 * 
 * Then use **[CharacterName]:** for dialogue lines
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
     * Useful as fallback if no CHARACTERS block is defined
     */
    autoDetectCharacters(markdown) {
        const characters = new Set();
        
        // Match **[Name]:** pattern
        const dialogueRegex = /\*\*\[([^\]]+)\]:\*\*/g;
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
    applyColors(htmlContent, characters) {
        if (!characters || Object.keys(characters).length === 0) {
            return htmlContent;
        }

        let result = htmlContent;

        // For each character, wrap their dialogue lines with colored spans
        Object.entries(characters).forEach(([name, color]) => {
            // Match the rendered HTML pattern: <strong>[Name]:</strong>
            // And wrap the entire paragraph or line in a colored container
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Pattern 1: <strong>[Name]:</strong> at start of paragraph
            const pattern1 = new RegExp(
                `(<p>)(<strong>\\[${escapedName}\\]:<\\/strong>)`,
                'gi'
            );
            result = result.replace(pattern1, 
                `$1<span class="character-line" data-character="${name}" style="--character-color: ${color}">$2`
            );

            // Pattern 2: Standalone <strong>[Name]:</strong> (not in paragraph)
            const pattern2 = new RegExp(
                `(<strong>\\[${escapedName}\\]:<\\/strong>)([^<]*?)(?=<|$)`,
                'gi'
            );
            result = result.replace(pattern2, 
                `<span class="character-line" data-character="${name}" style="--character-color: ${color}">$1$2</span>`
            );
        });

        // Close any unclosed character-line spans at paragraph end
        result = result.replace(
            /(<span class="character-line"[^>]*>)(.*?)(<\/p>)/gi,
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
                <span class="character-legend-color" style="background-color: ${color}"></span>
                <span class="character-legend-name">${name}</span>
            </div>
        `).join('');

        return `
            <div class="character-legend">
                <div class="character-legend-title">Characters</div>
                <div class="character-legend-items">
                    ${items}
                </div>
            </div>
        `;
    },

    /**
     * Process markdown content - main entry point
     * Returns { html: processedHTML, characters: characterMap, legend: legendHTML }
     */
    process(markdown, markedInstance) {
        // Parse character definitions
        let { characters, content } = this.parseCharacters(markdown);

        // If no characters defined, try auto-detection
        if (Object.keys(characters).length === 0) {
            characters = this.autoDetectCharacters(content);
        }

        // Convert markdown to HTML
        const rawHTML = markedInstance ? markedInstance.parse(content) : content;

        // Apply character colors
        const coloredHTML = this.applyColors(rawHTML, characters);

        // Generate legend
        const legend = this.generateLegendHTML(characters);

        return {
            html: coloredHTML,
            characters,
            legend,
            hasMultipleCharacters: Object.keys(characters).length > 1
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterDialogue;
}
