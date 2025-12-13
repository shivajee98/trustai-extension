document.addEventListener('DOMContentLoaded', async () => {
    
    const ui = {
        views: {
            login: document.getElementById('login-view'),
            app: document.getElementById('app-view'),
            initial: document.getElementById('initial-view'),
            results: document.getElementById('results-view')
        },
        auth: {
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            userEmail: document.getElementById('user-email-chip')
        },
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        analyzeBtn: document.getElementById('analyze-btn'),
        manualAnalyzeBtn: document.getElementById('manual-analyze-btn'),
        manualInput: document.getElementById('manual-input'),
        resetBtn: document.getElementById('reset-btn'),
        results: {
            scoreText: document.getElementById('score-text'),
            scoreCircle: document.getElementById('score-circle'),
            verdictBadge: document.getElementById('verdict-badge'),
            riskLevel: document.getElementById('risk-level'),
            contentType: document.getElementById('content-type'),
            reasoningBox: document.getElementById('reasoning-box')
        }
    };

    
    const STATE_PREFIX = 'analysis_cache_';
    let currentTabId = null;
    let authToken = null;

    
    async function init() {
        try {
            
            const storage = await chrome.storage.local.get('auth_token');
            console.log("TrustAI: Popup Init. Storage:", storage);

            if (storage.auth_token) {
                console.log("TrustAI: Token found, showing app.");
                authToken = storage.auth_token;
                showAppView();
            } else {
                showLoginView();
            }

            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                currentTabId = tab.id;
                
                if (authToken) {
                    await restoreState(currentTabId);
                    fetchQuota(); 

                    
                    const userEmail = ui.auth.userEmail.textContent; 
                    const emailEl = document.getElementById('user-email-chip');
                    const acEmailEl = document.getElementById('ac-email');
                    if (emailEl) emailEl.textContent = userEmail;
                    if (acEmailEl) acEmailEl.textContent = userEmail;
                }
            }
        } catch (e) {
            console.error("Initialization failed:", e);
            showLoginView(); 
        }
    }

    init();

    

    function showLoginView() {
        ui.views.app.classList.add('hidden');
        ui.views.login.classList.remove('hidden');
    }

    function showAppView() {
        ui.views.login.classList.add('hidden');
        ui.views.app.classList.remove('hidden');

        
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            ui.auth.userEmail.textContent = payload.email || 'User';
        } catch (e) {
            ui.auth.userEmail.textContent = 'Account';
        }
    }

    ui.auth.loginBtn.addEventListener('click', () => {
        const extId = chrome.runtime.id;
        
        const authUrl = `https:
        chrome.tabs.create({ url: authUrl });
    });

    ui.auth.logoutBtn.addEventListener('click', async () => {
        await chrome.storage.local.remove('auth_token');
        authToken = null;
        showLoginView();
    });

    
    
    ui.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            
            ui.tabs.forEach(t => t.classList.remove('active'));
            ui.tabContents.forEach(c => c.classList.remove('active'));

            
            tab.classList.add('active');
            const targetId = tab.dataset.tab; 
            document.getElementById(targetId).classList.add('active');

            
            if (targetId === 'tab-history') {
                loadHistory();
            } else if (targetId === 'tab-account') {
                fetchQuota();
            }
        });
    });

    async function loadHistory() {
        const listContainer = document.getElementById('history-list');
        listContainer.innerHTML = '<p style="text-align:center; color:#9ca3af; margin-top:20px;">Fetching history...</p>';

        
        try {
            const cache = await chrome.storage.local.get('scan_history');
            if (cache.scan_history && cache.scan_history.length > 0) {
                renderHistoryList(cache.scan_history, listContainer);
            }
        } catch (e) {
            console.warn("Cache read failed", e);
        }

        
        try {
            const res = await fetch('https://trust-ai-backend.vercel.app/api/history/', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!res.ok) throw new Error("Failed to fetch history");

            const history = await res.json();

            
            chrome.storage.local.set({ scan_history: history });

            
            if (history.length === 0) {
                listContainer.innerHTML = '<p style="text-align:center; color:#9ca3af; margin-top:20px;">No scan history found.</p>';
            } else {
                renderHistoryList(history, listContainer);
            }

        } catch (err) {
            console.error(err);
            if (!listContainer.hasChildNodes() || listContainer.innerHTML.includes("Fetching")) {
                listContainer.innerHTML = `<p style="text-align:center; color:#ef4444; margin-top:20px;">Error loading history.</p>`;
            }
        }
    }

    function renderHistoryList(items, container) {
        container.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="h-info">
                    <span class="h-url" title="${item.url}">${item.url || 'Text Scan'}</span>
                    <span class="h-date">${new Date(item.timestamp).toLocaleDateString()} ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span class="h-badge ${item.verdict}">${item.verdict}</span>
            `;

            
            el.addEventListener('click', () => {
                showHistoryDetail(item);
            });

            container.appendChild(el);
        });
    }

    function showHistoryDetail(item) {
        
        document.getElementById('history-list-view').classList.add('hidden');
        const detailView = document.getElementById('history-detail-view');
        detailView.classList.remove('hidden');

        
        const details = item.details || {};
        const score = details.trust_score || item.score || 0;

        
        const percentage = Math.max(0, Math.min(100, score));
        const circle = document.getElementById('h-score-circle');
        circle.style.strokeDasharray = `${percentage}, 100`;
        let color = '#ef4444';
        if (percentage >= 80) color = '#10b981';
        else if (percentage >= 50) color = '#f59e0b';
        circle.style.stroke = color;
        document.getElementById('h-score-text').textContent = percentage;

        
        const verdict = item.verdict || "Unverified";
        const badge = document.getElementById('h-verdict-badge');
        badge.textContent = verdict;
        badge.className = `verdict-badge ${verdict.split(' ')[0]}`;

        
        document.getElementById('h-timestamp').textContent = new Date(item.timestamp).toLocaleString();
        document.getElementById('h-risk-level').innerHTML = `<strong>${item.risk_level || "Unknown"}</strong>`;
        document.getElementById('h-content-type').textContent = item.url ? "URL" : "Text";

        
        const steps = details.reasoning_steps || [];
        const box = document.getElementById('h-reasoning-box');
        if (steps.length > 0) {
            box.innerHTML = `<ul style="margin:0; padding-left:16px;">${steps.slice(0, 4).map(s => `<li>${s}</li>`).join('')}</ul>`;
        } else {
            box.textContent = "No specific reasoning provided.";
        }
    }

    
    document.getElementById('history-back-btn').addEventListener('click', () => {
        document.getElementById('history-detail-view').classList.add('hidden');
        document.getElementById('history-list-view').classList.remove('hidden');
    });

    

    async function fetchQuota() {
        try {
            const res = await fetch('https://trust-ai-backend.vercel.app/api/quota/', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();

                
                const percent = Math.min((data.used / data.limit) * 100, 100);
                const progressBar = document.getElementById('ac-progress');
                const usageText = document.getElementById('ac-usage-text');

                if (progressBar) progressBar.style.width = `${percent}%`;
                if (usageText) usageText.textContent = `${data.used} / ${data.limit} Tokens`;

                
                if (progressBar) {
                    if (percent > 90) progressBar.style.backgroundColor = '#ef4444';
                    else if (percent > 70) progressBar.style.backgroundColor = '#f59e0b';
                    else progressBar.style.backgroundColor = '#10b981';
                }
            }
        } catch (e) {
            console.warn("Quota fetch failed:", e);
        }
    }

    async function restoreState(tabId) {
        try {
            const key = STATE_PREFIX + tabId;
            const storage = await chrome.storage.session.get(key);
            const savedResult = storage[key];

            if (savedResult) {
                renderResults(savedResult, true); 
            }
        } catch (e) {
            console.warn("TrustAI: State restore failed", e);
        }
    }

    async function saveState(tabId, result) {
        if (!tabId || !result) return;
        try {
            const key = STATE_PREFIX + tabId;
            await chrome.storage.session.set({ [key]: result });
        } catch (e) {
            console.warn("TrustAI: State save failed", e);
        }
    }

    async function clearState(tabId) {
        if (!tabId) return;
        try {
            const key = STATE_PREFIX + tabId;
            await chrome.storage.session.remove(key);
        } catch (e) {
            console.warn("TrustAI: State clear failed", e);
        }
    }

    function renderResults(data, isRestoring = false) {
        
        if (!isRestoring) {
            
            document.querySelector('[data-tab="tab-analyze"]').click();
        }

        
        ui.views.initial.classList.add('hidden');
        ui.views.results.classList.remove('hidden');

        
        const score = data.trust_score || 0;
        updateGauge(score);

        const verdict = data.verdict || "Unverified";
        ui.results.verdictBadge.textContent = verdict;
        ui.results.verdictBadge.className = `verdict-badge ${verdict.split(' ')[0]}`;

        ui.results.riskLevel.innerHTML = `<strong>${data.risk_level || "Unknown"}</strong>`;
        ui.results.contentType.textContent = data.content_type || "Analysis Result";

        
        const steps = data.reasoning_steps || [];
        if (steps.length > 0) {
            ui.results.reasoningBox.innerHTML = `<ul style="margin:0; padding-left:16px;">${steps.slice(0, 4).map(s => `<li>${s}</li>`).join('')}</ul>`;
        } else {
            ui.results.reasoningBox.textContent = "No specific reasoning provided.";
        }

        
        if (!isRestoring && data.flagged_segments && currentTabId) {
            const validSegments = data.flagged_segments
                .filter(s => typeof s === 'string' && s.length >= 4)
                .slice(0, 10);

            if (validSegments.length > 0) {
                chrome.tabs.sendMessage(currentTabId, {
                    action: "HIGHLIGHT_SEGMENTS",
                    segments: validSegments
                });
            }
        }
    }

    function updateGauge(score) {
        const percentage = Math.max(0, Math.min(100, score));
        ui.results.scoreCircle.style.strokeDasharray = `${percentage}, 100`;
        let color = '#ef4444'; 
        if (percentage >= 80) color = '#10b981'; 
        else if (percentage >= 50) color = '#f59e0b'; 
        ui.results.scoreCircle.style.stroke = color;
        ui.results.scoreText.textContent = percentage;
    }

    async function resetUI() {
        if (currentTabId) {
            await clearState(currentTabId);
        }

        
        ui.views.results.classList.add('hidden');
        ui.views.initial.classList.remove('hidden');

        ui.analyzeBtn.disabled = false;
        ui.analyzeBtn.innerHTML = '<span>🔍</span> Analyze Page';
        ui.manualAnalyzeBtn.disabled = false;
        ui.manualAnalyzeBtn.innerHTML = 'Verify Input';
    }

    

    async function performAnalysis(payload) {
        if (!authToken) {
            showLoginView();
            return;
        }

        
        ui.views.initial.classList.add('hidden');
        ui.views.results.classList.remove('hidden');

        ui.results.verdictBadge.textContent = 'Consulting AI...';
        ui.results.verdictBadge.className = 'verdict-badge';
        ui.results.scoreText.textContent = '--';
        ui.results.scoreCircle.style.strokeDasharray = '0, 100';
        ui.results.scoreCircle.style.stroke = '#eee';

        try {
            const API_URL = 'https://trust-ai-backend.vercel.app/api/verify/';
            const apiRes = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify(payload)
            });

            if (apiRes.status === 401 || apiRes.status === 403) {
                throw new Error("Session expired. Please sign in again.");
            }

            if (!apiRes.ok) throw new Error("Backend Agent unreachable.");

            const data = await apiRes.json();

            const resultObject = {
                trust_score: data.trust_score,
                verdict: data.verdict,
                risk_level: data.risk_level,
                flagged_segments: data.flagged_segments,
                reasoning_steps: data.reasoning_steps,
                content_type: payload.url ? "Web Page" : "Text/Manual",
                timestamp: Date.now()
            };

            if (currentTabId) {
                await saveState(currentTabId, resultObject);
            }
            renderResults(resultObject, false);

        } catch (err) {
            console.error(err);
            if (err.message.includes("Session expired")) {
                await chrome.storage.local.remove('auth_token');
                authToken = null;
                showLoginView();
                return;
            }

            ui.results.verdictBadge.textContent = "Error";
            ui.results.verdictBadge.className = "verdict-badge Scam";
            ui.results.reasoningBox.textContent = err.message || "An unexpected error occurred.";

            ui.analyzeBtn.disabled = false;
            ui.manualAnalyzeBtn.disabled = false;
        }
    }

    

    ui.resetBtn.addEventListener('click', resetUI);

    ui.analyzeBtn.addEventListener('click', async () => {
        ui.analyzeBtn.disabled = true;
        ui.analyzeBtn.innerHTML = '<span>⏳</span> Extracting...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab.");

            if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
                throw new Error("Cannot analyze system pages.");
            }

            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_CONTENT" });
            } catch (err) {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
                response = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_CONTENT" });
            }

            if (!response || !response.text) throw new Error("Could not read page content.");

            performAnalysis({
                url: tab.url,
                text: response.text.substring(0, 8000),
                dom_metadata: response.metadata || {},
                tabId: tab.id
            });

        } catch (err) {
            ui.views.results.classList.remove('hidden');
            ui.tabContents.forEach(c => c.style.display = 'none');
            document.querySelector('.tabs').style.display = 'none';
            ui.results.reasoningBox.textContent = err.message;
            ui.results.verdictBadge.textContent = "System Error";
        }
    });

    ui.manualAnalyzeBtn.addEventListener('click', () => {
        const inputVal = ui.manualInput.value.trim();
        if (!inputVal) return;

        ui.manualAnalyzeBtn.disabled = true;
        ui.manualAnalyzeBtn.innerHTML = '<span>⏳</span> Sending...';

        let payload = {};
        if (inputVal.startsWith('http://') || inputVal.startsWith('https://')) {
            payload = { url: inputVal };
        } else {
            payload = { text: inputVal };
        }
        payload.tabId = currentTabId;

        performAnalysis(payload);
    });
});

