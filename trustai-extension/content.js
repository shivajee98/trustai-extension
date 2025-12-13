chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_CONTENT") {
        const text = document.body.innerText;

        
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input')).map(i => i.name || i.type || 'unknown')
        }));

        const scripts = Array.from(document.querySelectorAll('script[src]'))
            .map(s => s.src)
            .filter(src => src.startsWith('http'))
            .slice(0, 5); 

        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .slice(0, 10); 

        const metadata = {
            forms: forms,
            scripts: scripts,
            links: links,
            title: document.title
        };

        sendResponse({ text: text, metadata: metadata });
    }

    if (request.action === "HIGHLIGHT_SEGMENTS") {
        const segments = request.segments;
        if (!segments || !Array.isArray(segments) || segments.length === 0) return;

        console.log("TrustAI: Highlighting segments...", segments);

        
        const normalizedSegments = segments
            .filter(s => s && s.length >= 4) 
            .map(s => s.trim());

        highlightSegments(normalizedSegments);
    }
});

function highlightSegments(segments) {
    if (segments.length === 0) return;

    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                
                const tag = node.parentElement.tagName;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                if (node.parentElement.classList.contains('trustai-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_SKIP;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodesToHighlight = [];

    
    
    let currentNode = walker.nextNode();
    while (currentNode) {
        
        for (const segment of segments) {
            if (currentNode.nodeValue.includes(segment)) {
                nodesToHighlight.push({ node: currentNode, text: segment });
                
                
                break;
            }
        }
        currentNode = walker.nextNode();
    }

    
    
    
    nodesToHighlight.forEach(({ node, text }) => {
        highlightTextNode(node, text);
    });
}

function highlightTextNode(textNode, searchText) {
    const parent = textNode.parentNode;
    if (!parent) return;

    const content = textNode.nodeValue;
    const index = content.indexOf(searchText);

    if (index >= 0) {
        
        
        
        

        
        

        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + searchText.length);

        const span = document.createElement('span');
        span.className = 'trustai-highlight';
        span.title = "TrustAI: Suspicious Content";
        span.style.backgroundColor = 'rgba(255, 204, 0, 0.4)';
        span.style.borderBottom = '2px solid #ef4444';
        span.style.cursor = 'help';

        try {
            
            range.surroundContents(span);
        } catch (e) {
            console.warn("TrustAI: Failed to wrap text node", e);
        }
    }
}
