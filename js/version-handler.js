/**
 * Version Handler for The Immaterial Loom Reader
 * ===============================================
 * Handles versioned scripts with multiple content variants
 * 
 * Add this to reader.html before the main script:
 * <script src="js/version-handler.js"></script>
 */

const VersionHandler = {
    // Get version ID from URL
    getVersionId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('version');
    },

    // Check if script has versions
    hasVersions(script) {
        return script.hasVersions && script.versions && script.versions.length > 0;
    },

    // Get specific version from script
    getVersion(script, versionId) {
        if (!this.hasVersions(script)) return null;
        
        // If no versionId specified, return first version
        if (!versionId) return script.versions[0];
        
        // Find matching version
        const version = script.versions.find(v => v.versionId === versionId);
        return version || script.versions[0]; // Fallback to first
    },

    // Merge version data with script base data
    // Version-specific fields override script-level fields
    mergeVersionData(script, version) {
        return {
            ...script,
            // Version-specific overrides
            title: version.title,
            tags: version.tags,
            synopsis: version.synopsis,
            image: version.image || script.image,
            contentFile: version.contentFile,
            contentFileCondensed: version.contentFileCondensed || '',
            previewFile: version.previewFile || script.previewFile,
            scriptbinLink: version.scriptbinLink || script.scriptbinLink,
            // Keep reference to version info
            _currentVersion: version,
            _allVersions: script.versions
        };
    },

    // Build version switcher HTML
    buildVersionSwitcher(script, currentVersionId) {
        if (!this.hasVersions(script)) return '';

        const buttons = script.versions.map(version => {
            const isActive = version.versionId === currentVersionId ? 'active' : '';
            const url = `reader.html?id=${script.id}&version=${version.versionId}`;
            return `
                <a href="${url}" class="version-btn ${isActive}">
                    ${escapeHtml(version.versionLabel)}
                </a>
            `;
        }).join('');

        return `
            <div class="version-switcher">
                <span class="version-switcher-label">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Version:
                </span>
                ${buttons}
            </div>
        `;
    },

    // Update URL without page reload (for future use)
    updateUrl(scriptId, versionId) {
        const url = new URL(window.location);
        url.searchParams.set('id', scriptId);
        if (versionId) {
            url.searchParams.set('version', versionId);
        } else {
            url.searchParams.delete('version');
        }
        window.history.pushState({}, '', url);
    },

    // For Patreon versioned scripts - get R2 paths
    getPatreonPaths(script, versionId) {
        if (!this.hasVersions(script)) {
            return null; // Not versioned, use default handling
        }

        const version = this.getVersion(script, versionId);
        if (!version) return null;

        // Return version-specific R2 paths (these would be configured in worker)
        return {
            versionId: version.versionId,
            versionLabel: version.versionLabel
        };
    }
};

// Helper function (same as in reader.html)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionHandler;
}
