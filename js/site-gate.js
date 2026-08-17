/* =========================================================================
   AGE GATE + IMAGE SPOILERS
   -------------------------------------------------------------------------
   Loaded by BOTH index.html and reader.html, from <head>, so the gate is in
   place before any explicit content can paint. Pair it with this snippet in
   each page's <head>, above the stylesheet:

       <script>document.documentElement.classList.add('age-locked');</script>

   That class hides page content via css/site-gate.css until the visitor
   confirms their age, which means a direct link to a script page is gated
   the same way the front page is.
   ========================================================================= */

(function () {
    'use strict';

    var KEYS = {
        age: 'ageVerified',
        spoiler: 'spoilerImages',   // 'true' = blur on (default), 'false' = permanently off
        revealed: 'revealedImages'  // session-scoped list of already-revealed images
    };

    var EXIT_URL = 'https://www.google.com';

    /* ===================================================================
       AGE GATE
       =================================================================== */

    function isAgeVerified() {
        try { return localStorage.getItem(KEYS.age) === 'true'; }
        catch (e) { return false; }
    }

    function buildAgeModal() {
        var overlay = document.createElement('div');
        overlay.className = 'age-modal-overlay';
        overlay.id = 'ageModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ageModalTitle');

        overlay.innerHTML = [
            '<div class="age-modal">',
            '  <div class="age-modal-badge">18+</div>',
            '  <h2 class="age-modal-title" id="ageModalTitle">Adults Only</h2>',
            '  <p class="age-modal-text">',
            '    The Immaterial Loom is an archive of <strong>explicit audio scripts written for adults</strong>.',
            '    Everything past this point is sexual in nature and is not suitable for minors.',
            '  </p>',
            '  <ul class="age-modal-terms">',
            '    <li>I am <strong>18 years of age or older</strong> (or the age of majority where I live, whichever is greater).</li>',
            '    <li>I am viewing this material of my own free will, and it is legal to do so where I am.</li>',
            '    <li>All characters depicted are adults, and everything here is fiction.</li>',
            '    <li>I will not share this material with anyone under 18.</li>',
            '  </ul>',
            '  <div class="age-modal-buttons">',
            '    <button type="button" class="age-modal-btn proceed" id="ageProceedBtn">I am 18 or older</button>',
            '    <button type="button" class="age-modal-btn leave" id="ageLeaveBtn">Take me back</button>',
            '  </div>',
            '  <p class="age-modal-footnote">Your answer is remembered on this device only. Clearing your browser data will bring this back.</p>',
            '</div>'
        ].join('\n');

        return overlay;
    }

    function unlockSite() {
        document.documentElement.classList.remove('age-locked');
        document.body.classList.remove('age-unverified');
        var modal = document.getElementById('ageModal');
        if (modal) modal.remove();
        document.removeEventListener('keydown', trapFocus, true);
    }

    // Keeps keyboard focus inside the gate so the page behind stays unreachable.
    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        var modal = document.getElementById('ageModal');
        if (!modal) return;

        var focusable = modal.querySelectorAll('button');
        if (!focusable.length) return;

        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function showAgeGate() {
        var overlay = buildAgeModal();
        document.body.appendChild(overlay);
        document.body.classList.add('age-unverified');

        overlay.querySelector('#ageProceedBtn').addEventListener('click', function () {
            try { localStorage.setItem(KEYS.age, 'true'); } catch (e) {}
            unlockSite();
        });

        overlay.querySelector('#ageLeaveBtn').addEventListener('click', function () {
            try { localStorage.removeItem(KEYS.age); } catch (e) {}
            window.location.href = EXIT_URL;
        });

        document.addEventListener('keydown', trapFocus, true);
        overlay.querySelector('#ageProceedBtn').focus();
    }

    function initAgeGate() {
        if (isAgeVerified()) {
            unlockSite();
        } else {
            showAgeGate();
        }
    }

    /* ===================================================================
       IMAGE SPOILERS
       Every cover and card image starts blurred behind a "click to reveal"
       veil. Revealing one image reveals only that image; the Options panel
       has a switch that turns the blur off for good.
       =================================================================== */

    function spoilersEnabled() {
        try { return localStorage.getItem(KEYS.spoiler) !== 'false'; }
        catch (e) { return true; }
    }

    function getRevealed() {
        try { return JSON.parse(sessionStorage.getItem(KEYS.revealed)) || []; }
        catch (e) { return []; }
    }

    function rememberRevealed(key, on) {
        if (!key) return;
        try {
            var list = getRevealed();
            var i = list.indexOf(key);
            if (on && i === -1) list.push(key);
            if (!on && i > -1) list.splice(i, 1);
            sessionStorage.setItem(KEYS.revealed, JSON.stringify(list));
        } catch (e) {}
    }

    // Identify a container by the image it holds, so a reveal survives
    // navigating into a script and coming back during the same visit.
    function containerKey(container) {
        var img = container.querySelector('img');
        return img ? (img.getAttribute('src') || '') : '';
    }

    var VEIL_HTML = [
        '<svg class="spoiler-veil-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">',
        '  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243" />',
        '</svg>',
        '<span class="spoiler-veil-label">Spoilered</span>',
        '<span class="spoiler-veil-hint">Click to reveal</span>'
    ].join('');

    var REHIDE_HTML = [
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">',
        '  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21" />',
        '</svg>',
        '<span>Hide</span>'
    ].join('');

    // Adds the veil + re-hide button to any image container that lacks them.
    function decorate(container) {
        if (container.dataset.spoilerReady === 'true') return;
        container.dataset.spoilerReady = 'true';

        var veil = document.createElement('button');
        veil.type = 'button';
        veil.className = 'spoiler-veil';
        veil.innerHTML = VEIL_HTML;
        veil.setAttribute('aria-label', 'Spoilered image. Click to reveal.');
        veil.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(container, true);
        });

        var rehide = document.createElement('button');
        rehide.type = 'button';
        rehide.className = 'spoiler-rehide';
        rehide.innerHTML = REHIDE_HTML;
        rehide.setAttribute('aria-label', 'Hide this image again');
        rehide.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(container, false);
        });

        container.appendChild(veil);
        container.appendChild(rehide);

        if (getRevealed().indexOf(containerKey(container)) > -1) {
            container.classList.add('revealed');
        }
    }

    function setRevealed(container, on) {
        container.classList.toggle('revealed', on);
        rememberRevealed(containerKey(container), on);
    }

    function decorateAll() {
        var containers = document.querySelectorAll('.card-image-container, .script-cover');
        for (var i = 0; i < containers.length; i++) decorate(containers[i]);
    }

    // Cards are re-rendered constantly (filtering, sorting, version rotation),
    // so watch the DOM instead of decorating once.
    function watchForNewImages() {
        if (!window.MutationObserver) return;
        var observer = new MutationObserver(function () { decorateAll(); });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function applySpoilerMode() {
        document.body.classList.toggle('spoiler-images', spoilersEnabled());
        syncToggleUI();
    }

    function setSpoilerMode(on) {
        try { localStorage.setItem(KEYS.spoiler, on ? 'true' : 'false'); } catch (e) {}
        if (!on) {
            // Turning blur off clears per-image reveals; they'd be meaningless.
            try { sessionStorage.removeItem(KEYS.revealed); } catch (e) {}
            var revealed = document.querySelectorAll('.revealed');
            for (var i = 0; i < revealed.length; i++) revealed[i].classList.remove('revealed');
        }
        applySpoilerMode();
    }

    function syncToggleUI() {
        var toggle = document.getElementById('spoilerToggle');
        if (!toggle) return;
        var on = spoilersEnabled();
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        var label = toggle.querySelector('.option-toggle-state');
        if (label) label.textContent = on ? 'On' : 'Off';
    }

    function initSpoilerToggle() {
        var toggle = document.getElementById('spoilerToggle');
        if (!toggle) return;
        toggle.addEventListener('click', function () {
            setSpoilerMode(!spoilersEnabled());
        });
        syncToggleUI();
    }

    function initSpoilers() {
        applySpoilerMode();
        decorateAll();
        watchForNewImages();
        initSpoilerToggle();
    }

    /* ===================================================================
       BOOT
       =================================================================== */

    function boot() {
        initAgeGate();
        initSpoilers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Exposed so the Options panel's "Reset to Defaults" can restore blurring.
    window.SiteGate = {
        setSpoilerMode: setSpoilerMode,
        spoilersEnabled: spoilersEnabled,
        resetSpoilers: function () { setSpoilerMode(true); }
    };
})();
