
const VersionHandler = {
    
    getVersionId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('version');
    },

    hasVersions(script) {
        return script.hasVersions && script.versions && script.versions.length > 0;
    },

    getVersion(script, versionId) {
        if (!this.hasVersions(script)) return null;
        
        if (!versionId) return script.versions[0];
        
        const version = script.versions.find(v => v.versionId === versionId);
        return version || script.versions[0]; 
    },

    mergeVersionData(script, version) {
        return {
            ...script,
            title: version.title,
            tags: version.tags,
            synopsis: version.synopsis,
            image: version.image || script.image,
            contentFile: version.contentFile,
            contentFileCondensed: version.contentFileCondensed || '',
            previewFile: version.previewFile || script.previewFile,
            scriptbinLink: version.scriptbinLink || script.scriptbinLink,
            _currentVersion: version,
            _allVersions: script.versions
        };
    },

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


    getPatreonPaths(script, versionId) {
        if (!this.hasVersions(script)) {
            return null; 
        }

        const version = this.getVersion(script, versionId);
        if (!version) return null;

        return {
            versionId: version.versionId,
            versionLabel: version.versionLabel
        };
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionHandler;
}
