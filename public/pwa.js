const offlineStatus = document.getElementById('offline-status');
function updateNetworkStatus() {
    offlineStatus.hidden = navigator.onLine;
}
updateNetworkStatus();
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
}
