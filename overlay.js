// show/hide overlay by watching the #status and #progressFill elements updated by popup.js
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('loadingOverlay');
    const statusEl = document.getElementById('status');
    const progressFill = document.getElementById('progressFill');
    const overlayMainTitle = document.getElementById('overlayMainTitle');
    const overlayStatusText = document.getElementById('overlayStatusText');
    const overlayProgress = document.getElementById('overlayProgress');
    const overlayHint = document.getElementById('overlayHint');
    const overlayClose = document.getElementById('overlayClose');

    let slowTimer = null;
    let verySlowTimer = null;

    const defaultHint = 'Downloading model may take a few minutes on first run.';

    function clearTimers() {
        if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
        if (verySlowTimer) { clearTimeout(verySlowTimer); verySlowTimer = null; }
    }

    function parsePercentFromStyle(styleWidth) {
        if (!styleWidth) return 0;
        const m = styleWidth.match(/(\d+)(?:\.\d+)?%/);
        return m ? Number(m[1]) : 0;
    }

    function updateOverlay() {
        if (!statusEl || !overlay) return;
        const cls = (statusEl.className || '').toLowerCase();
        const rawText = (statusEl.textContent || statusEl.innerText || '').trim();
        const progressStyle = progressFill && progressFill.style && progressFill.style.width ? progressFill.style.width : '';
        const progressPct = parsePercentFromStyle(progressStyle);

        // Check if the chat input is enabled (indicates AI is ready)
        const chatInput = document.getElementById('chatInput');
        const isInputEnabled = chatInput && !chatInput.disabled;
        
        // Check if AI is ready by multiple indicators
        const isReady = cls.includes('ready') || 
                       rawText.toLowerCase().includes('ready') ||
                       isInputEnabled ||
                       (progressPct === 100 && rawText.toLowerCase().includes('ai is ready'));

        // If AI is ready, hide overlay immediately
        if (isReady) {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
            clearTimers();
            overlayProgress.style.width = '0%';
            overlayMainTitle.textContent = 'Initializing AI';
            overlayStatusText.textContent = 'Ready';
            overlayHint.textContent = defaultHint;
            return;
        }

        // decide if we're in downloading phase
        const isDownloading = /download/i.test(rawText) || (progressPct > 0 && progressPct < 100);

        if (isDownloading) {
            overlayMainTitle.textContent = 'Downloading Gemini model — Please wait';
            overlayStatusText.textContent = `Downloading... ${progressPct || '...' }%`;
            overlayProgress.style.width = (progressPct ? progressPct + '%' : '0%');
            overlayHint.textContent = defaultHint;

            // start slow timers if not already set
            if (!slowTimer) {
                slowTimer = setTimeout(() => {
                    overlayHint.textContent = 'This is taking longer than usual. Please hold on — your chat will be ready in a few minutes.';
                }, 15000); // 15s
            }
            if (!verySlowTimer) {
                verySlowTimer = setTimeout(() => {
                    overlayHint.textContent = 'Still working — thanks for your patience. The setup may take a few more minutes.';
                }, 45000); // 45s
            }

            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
            return;
        }

        // if progress hit 100 but status not ready yet - add timeout fallback
        if (progressPct === 100) {
            overlayMainTitle.textContent = 'Download complete (100%) — Finalizing';
            overlayStatusText.textContent = rawText || 'Finalizing setup...';
            overlayProgress.style.width = '100%';
            overlayHint.textContent = 'Almost ready — finishing model setup. This may take a few more moments.';
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
            
            // Auto-hide overlay after 10 seconds if still stuck at 100%
            if (!slowTimer) {
                slowTimer = setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.setAttribute('aria-hidden', 'true');
                    clearTimers();
                }, 10000); // 10s timeout
            }
            return;
        }

        // fallback: show status text for other non-ready states (e.g., checking)
        overlayMainTitle.textContent = 'Initializing AI';
        overlayStatusText.textContent = rawText || 'Checking availability...';
        overlayProgress.style.width = (progressPct ? progressPct + '%' : '0%');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    // initial update
    updateOverlay();

    // observe changes to status element, progressFill, and chat input
    if (statusEl) {
        const observer = new MutationObserver(updateOverlay);
        observer.observe(statusEl, { attributes: true, childList: true, characterData: true, subtree: true });
        if (progressFill) observer.observe(progressFill, { attributes: true, attributeFilter: ['style'] });
        
        // Also observe chat input for disabled attribute changes
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            observer.observe(chatInput, { attributes: true, attributeFilter: ['disabled'] });
        }
    }
    
    // Periodically check if overlay should be hidden (fallback mechanism)
    const fallbackCheck = setInterval(() => {
        if (overlay && overlay.style.display !== 'none') {
            updateOverlay();
            
            // If chat input becomes enabled, we know AI is ready
            const chatInput = document.getElementById('chatInput');
            if (chatInput && !chatInput.disabled) {
                clearInterval(fallbackCheck);
                if (overlay.style.display !== 'none') {
                    overlay.style.display = 'none';
                    overlay.setAttribute('aria-hidden', 'true');
                    clearTimers();
                }
            }
        } else {
            // Overlay is hidden, stop checking
            clearInterval(fallbackCheck);
        }
    }, 1000); // Check every second

    // allow user to dismiss overlay manually
    if (overlayClose) {
        overlayClose.addEventListener('click', () => {
            if (overlay) { 
                overlay.style.display = 'none'; 
                overlay.setAttribute('aria-hidden','true'); 
                clearTimers(); 
            }
        });
    }
    
    // Allow escape key to close overlay
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
            clearTimers();
        }
    });

    // back button behavior
    const back = document.getElementById('backButton');
    if (back) back.addEventListener('click', () => window.close());
});
