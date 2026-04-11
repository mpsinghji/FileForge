// Local history for operations that don't require authentication
const HISTORY_KEY = 'fileforge_local_history';
const MAX_HISTORY_ITEMS = 100;
const EXPIRY_DAYS = 7;

export function addToLocalHistory(item) {
  try {
    const history = getLocalHistory();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);
    
    const newItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      ...item
    };
    
    history.unshift(newItem);
    
    // Keep only last MAX_HISTORY_ITEMS
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    return newItem;
  } catch (error) {
    console.error('Failed to add to local history:', error);
    return null;
  }
}

export function getLocalHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    const now = new Date();
    
    // Filter out expired items
    const validHistory = history.filter(item => {
      if (!item.expiresAt) return true; // Keep items without expiry (legacy)
      return new Date(item.expiresAt) > now;
    });
    
    // Update storage if we filtered anything out
    if (validHistory.length !== history.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
      console.log(`🧹 Cleaned up ${history.length - validHistory.length} expired local history items`);
    }
    
    return validHistory;
  } catch (error) {
    console.error('Failed to get local history:', error);
    return [];
  }
}

export function clearLocalHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear local history:', error);
    return false;
  }
}

export function deleteLocalHistoryItem(id) {
  try {
    const history = getLocalHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete history item:', error);
    return false;
  }
}

export function getLocalHistoryByType(operationType) {
  const history = getLocalHistory();
  return history.filter(item => item.operationType === operationType);
}
