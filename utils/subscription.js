/**
 * Check if user subscription is expired
 * @param {Object} user - User object with expiry_date and is_subscribed
 * @returns {boolean} - True if subscription is expired
 */
export const isSubscriptionExpired = (user) => {
  if (!user) return true;
  
  // If tier is "none", subscription is expired
  if (user.tier === "none" || !user.is_subscribed) {
    return true;
  }
  
  // If no expiry date, check subscription status
  if (!user.expiry_date) {
    return !user.is_subscribed;
  }
  
  // Check if expiry date has passed
  const expiryDate = new Date(user.expiry_date);
  const now = new Date();
  
  return expiryDate < now;
};

/**
 * Get time remaining until expiry
 * @param {Object} user - User object with expiry_date
 * @returns {Object} - { days, hours, minutes, seconds, expired }
 */
export const getTimeRemaining = (user) => {
  if (!user || !user.expiry_date) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  const expiryDate = new Date(user.expiry_date);
  const now = new Date();
  const difference = expiryDate - now;
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, expired: false };
};

