/* =========================================================================
   CATEGORIES + AUDIENCE — single source of truth
   -------------------------------------------------------------------------
   Loaded by BOTH index.html and reader.html. Edit categories here and the
   sidebar, counts, card chips, reader page and search all update together.

   TO ADD A CATEGORY: add one entry to CATEGORY_DEFS below. That's it.
   TO REORDER THE SIDEBAR: move the entry up or down in the list.
   ========================================================================= */

const CATEGORY_DEFS = [
    { slug: 'fantasy',      label: 'Fantasy',       icon: '🐉' },
    { slug: 'scifi',        label: 'Sci-Fi',        icon: '🚀' },
    { slug: 'warhammer',    label: 'Warhammer',     icon: '⚔️' },
    { slug: 'medfet',       label: 'MedFet',        icon: '🩺' },
    { slug: 'gfe',          label: 'GFE',           icon: '💕' },
    { slug: 'hookup',       label: 'Hook-up',       icon: '🔥' },
    { slug: 'roommate',     label: 'Roommate',      icon: '🏠' },
    { slug: 'joi',          label: 'JOI',           icon: '👀' },
    { slug: 'romantic',     label: 'Romantic',      icon: '🌹' },
    { slug: 'narrative',    label: 'Narrative',     icon: '📖' },
    { slug: 'monstergirl',  label: 'Monster-Girl',  icon: '👹' },
    { slug: 'fastfap',      label: 'Fast-Fap',      icon: '⚡' },
    { slug: 'multispeaker', label: 'Multi-Speaker', icon: '🎭' },
    { slug: 'milf',         label: "MILF's",        icon: '🍷' }
];

/* Alternate spellings that should resolve to a canonical slug.
   Punctuation and case are stripped before lookup, so "Sci-Fi", "sci fi"
   and "SCIFI" all already land on "scifi" without needing an entry. */
const CATEGORY_ALIASES = {
    milfs: 'milf',
    monstergirls: 'monstergirl',
    monster: 'monstergirl',
    scifi: 'scifi',
    sciencefiction: 'scifi',
    fastfaps: 'fastfap',
    multispeakers: 'multispeaker',
    medicalfetish: 'medfet',
    girlfriendexperience: 'gfe',
    onenightstand: 'hookup',
    jerkoffinstruction: 'joi'
};

const CATEGORY_MAP = CATEGORY_DEFS.reduce((acc, c) => {
    acc[c.slug] = c;
    return acc;
}, {});

const ALL_CATEGORY = { slug: 'all', label: 'All Scripts', icon: '✨' };

/* =========================================================================
   AUDIENCE (secondary filter)
   -------------------------------------------------------------------------
   Buckets are keyed on the LISTENER — the part after the "4" in tags like
   F4M, M4M, TF4M, F4A. A script is placed in a bucket by its tags unless it
   carries an explicit "audience" field, e.g.  "audience": ["4m", "4f"]
   ========================================================================= */

const AUDIENCE_DEFS = [
    { key: '4m', label: 'X4M', title: 'Scripts written for male listeners'   },
    { key: '4f', label: 'X4F', title: 'Scripts written for female listeners' },
    { key: '4a', label: 'A4A', title: 'Scripts written for any listener'     }
];

/* When true, a script marked for ANY listener (4A) also shows up under
   X4M and X4F. Set to false if you want A4A to be its own island. */
const ANY_AUDIENCE_MATCHES_ALL = true;

/* ===== NORMALISERS ===== */

function normalizeCategorySlug(value) {
    if (!value && value !== 0) return null;
    const cleaned = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleaned) return null;
    const resolved = CATEGORY_ALIASES[cleaned] || cleaned;
    return CATEGORY_MAP[resolved] ? resolved : null;
}

/**
 * Returns a script's categories as an array of valid slugs.
 * Accepts:  categories: ["gfe", "romantic"]   (preferred)
 *           categories: "gfe, romantic"       (comma string)
 *           category:   "fantasy"             (legacy single field)
 * Unknown or retired slugs are dropped, so a script can never point at a
 * category that no longer exists.
 */
function getScriptCategories(script) {
    if (!script) return [];
    let raw = script.categories;

    if (raw === undefined || raw === null) raw = script.category;
    if (raw === undefined || raw === null) return [];
    if (typeof raw === 'string') raw = raw.split(',');
    if (!Array.isArray(raw)) return [];

    const out = [];
    raw.forEach(item => {
        const slug = normalizeCategorySlug(item);
        if (slug && !out.includes(slug)) out.push(slug);
    });
    return out;
}

function getCategoryLabel(slug) {
    const def = CATEGORY_MAP[normalizeCategorySlug(slug)];
    return def ? def.label : null;
}

function getCategoryIcon(slug) {
    const def = CATEGORY_MAP[normalizeCategorySlug(slug)];
    return def ? def.icon : ALL_CATEGORY.icon;
}

/** Human-readable labels for a script, e.g. ["Fantasy", "Monster-Girl"] */
function getScriptCategoryLabels(script) {
    return getScriptCategories(script).map(getCategoryLabel).filter(Boolean);
}

/** Icon for a script — first category it belongs to, or the fallback star. */
function getScriptIcon(script) {
    const cats = getScriptCategories(script);
    return cats.length ? getCategoryIcon(cats[0]) : ALL_CATEGORY.icon;
}

/* ===== AUDIENCE DERIVATION ===== */

/** Pulls audience buckets out of a single tag like "F4M" / "TF4M" / "F4A". */
function audienceFromTag(tag) {
    const match = String(tag).toLowerCase().replace(/\s/g, '').match(/^[a-z]{1,4}4([a-z]{1,4})$/);
    if (!match) return [];
    const listener = match[1];
    if (listener.includes('a')) return ['4a'];
    const out = [];
    if (listener.includes('m')) out.push('4m');
    if (listener.includes('f')) out.push('4f');
    return out;
}

/**
 * All audience buckets a script belongs to. Uses an explicit "audience"
 * field when present, otherwise reads the F4M-style tags. Versioned scripts
 * pool the tags of every version.
 */
function getScriptAudiences(script) {
    if (!script) return [];
    const out = [];
    const push = key => { if (key && !out.includes(key)) out.push(key); };

    if (script.audience) {
        const raw = Array.isArray(script.audience) ? script.audience : String(script.audience).split(',');
        raw.forEach(item => {
            const cleaned = String(item).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleaned === '4m' || cleaned === 'm') push('4m');
            else if (cleaned === '4f' || cleaned === 'f') push('4f');
            else if (cleaned === '4a' || cleaned === 'a') push('4a');
            else audienceFromTag(cleaned).forEach(push);
        });
        if (out.length) return out;
    }

    const tagSets = script.hasVersions && Array.isArray(script.versions)
        ? script.versions.map(v => v.tags || [])
        : [script.tags || []];

    tagSets.forEach(tags => tags.forEach(tag => audienceFromTag(tag).forEach(push)));
    return out;
}

/** Does a script satisfy at least one of the selected audience buttons? */
function scriptMatchesAudiences(script, selected) {
    if (!selected || selected.length === 0) return true;
    const own = getScriptAudiences(script);
    if (own.length === 0) return false;
    return selected.some(key => {
        if (own.includes(key)) return true;
        if (ANY_AUDIENCE_MATCHES_ALL && key !== '4a' && own.includes('4a')) return true;
        return false;
    });
}

/* Expose for pages that load this as a plain script tag. */
if (typeof window !== 'undefined') {
    window.CATEGORY_DEFS = CATEGORY_DEFS;
    window.CATEGORY_MAP = CATEGORY_MAP;
    window.ALL_CATEGORY = ALL_CATEGORY;
    window.AUDIENCE_DEFS = AUDIENCE_DEFS;
    window.normalizeCategorySlug = normalizeCategorySlug;
    window.getScriptCategories = getScriptCategories;
    window.getScriptCategoryLabels = getScriptCategoryLabels;
    window.getCategoryLabel = getCategoryLabel;
    window.getCategoryIcon = getCategoryIcon;
    window.getScriptIcon = getScriptIcon;
    window.getScriptAudiences = getScriptAudiences;
    window.scriptMatchesAudiences = scriptMatchesAudiences;
}
