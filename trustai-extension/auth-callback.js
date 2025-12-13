
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

console.log("TrustAI: Callback processing...", window.location.href);

if (token) {
    chrome.storage.local.set({ auth_token: token }, () => {
        if (chrome.runtime.lastError) {
            console.error("TrustAI: Error saving token:", chrome.runtime.lastError);
            document.body.innerHTML = `<h2>Error Saving Token: ${chrome.runtime.lastError.message}</h2>`;
            return;
        }

        console.log('TrustAI: Token saved successfully:', token.substring(0, 10) + '...');
        document.body.innerHTML = '<h2>Authentication Successful! You can close this tab.</h2>';

        
        setTimeout(() => {
            
            window.close();
        }, 2000);
    });
} else {
    console.error("TrustAI: No token found in URL");
    document.body.innerHTML = '<h2>Error: No access token received from website.</h2>';
}
