const CharacterDialogue = {

    defaultColors: [
        '#ff6b9d', 
        '#8a6bff', 
        '#6bffc8', 
        '#ffb86b', 
        '#6bcfff', 
        '#ff6b6b', 
        '#c86bff', 
        '#6bff8a', 
    ],

    colorsEnabled: true,

    init() {
        const saved = localStorage.getItem('characterColorsEnabled');
        this.colorsEnabled = saved === null ? true : saved === 'true';
    },

    toggle(enabled) {
        this.colorsEnabled = enabled;
        localStorage.setItem('characterColorsEnabled', enabled);
    },

    parseCharacters(markdown) {
        const characters = {};
        let content = markdown;

        const charBlockRegex = /<!--\s*CHARACTERS\s*\n([\s\S]*?)-->/i;
        const match = markdown.match(charBlockRegex);

        if (match) {
            const charDefinitions = match[1].trim();
            const lines = charDefinitions.split('\n');

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const name = trimmed.substring(0, colonIndex).trim();
                    let color = trimmed.substring(colonIndex + 1).trim();

                    if (color && !color.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(color)) {
                        color = '#' + color;
                    }

                    if (name && color) {
                        characters[name] = color;
                    }
                }
            });

            content = markdown.replace(charBlockRegex, '').trim();
        }

        return { characters, content };
    },

    autoDetectCharacters(markdown) {
        const characters = new Set();
        
        const dialogueRegex = /\*\*\[?([^\]:\*]+)\]?:\*\*/g;
        let match;

        while ((match = dialogueRegex.exec(markdown)) !== null) {
            characters.add(match[1].trim());
        }

        const result = {};
        let colorIndex = 0;
        characters.forEach(name => {
            result[name] = this.defaultColors[colorIndex % this.defaultColors.length];
            colorIndex++;
        });

        return result;
    },


    applyColors(htmlContent, characters, hideNames = true) {
        if (!characters || Object.keys(characters).length === 0) {
            return htmlContent;
        }

        let result = htmlContent;

        Object.entries(characters).forEach(([name, color]) => {

            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            const patterns = [

                new RegExp(
                    `(<p>\\s*)(<strong>${escapedName}:</strong>)`,
                    'gi'
                ),
    
                new RegExp(
                    `(<p>\\s*)(<strong>\\[${escapedName}\\]:</strong>)`,
                    'gi'
                )
            ];

            patterns.forEach(pattern => {
                if (hideNames && this.colorsEnabled) {
    
                    result = result.replace(pattern, 
                        `$1<span class="character-line" data-character="${name}" style="--character-color: ${color}"><span class="character-name-hidden">$2</span>`
                    );
                } else {
        
                    result = result.replace(pattern, 
                        `$1<span class="character-line colors-off" data-character="${name}" style="--character-color: ${color}"><span class="character-name-visible">$2</span>`
                    );
                }
            });
        });

        result = result.replace(
            /(<span class="character-line[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/gi,
            '$1$2</span>$3'
        );

        return result;
    },

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

    process(markdown, markedInstance) {

        let { characters, content } = this.parseCharacters(markdown);

   
        if (Object.keys(characters).length === 0) {
            characters = this.autoDetectCharacters(content);
        }

        const rawHTML = markedInstance ? markedInstance.parse(content) : content;

        const coloredHTML = this.applyColors(rawHTML, characters, this.colorsEnabled);

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

    reprocess(rawHtml, characters) {
        return this.applyColors(rawHtml, characters, this.colorsEnabled);
    }
};

CharacterDialogue.init();

function toggleCharacterColors() {
    const newState = !CharacterDialogue.colorsEnabled;
    CharacterDialogue.toggle(newState);
    
    const toggleText = document.getElementById('colorToggleText');
    if (toggleText) {
        toggleText.textContent = newState ? 'Colors On' : 'Colors Off';
    }
    
    const toggleBtn = document.getElementById('characterToggleBtn');
    if (toggleBtn) {
        toggleBtn.classList.toggle('disabled', !newState);
    }

    if (window.reprocessCharacterContent) {
        window.reprocessCharacterContent();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterDialogue;
}
