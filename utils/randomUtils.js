// utils/randomUtils.js

/**
 * Get a random integer between min and max (inclusive)
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer between min and max
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Get a random floating-point number between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} [decimals=2] - Number of decimal places
   * @returns {number} Random float between min and max
   */
  function getRandomFloat(min, max, decimals = 2) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
  }
  
  /**
   * Get a random element from an array
   * @template T
   * @param {T[]} array - Array of elements
   * @returns {T} Random element from the array
   */
  function getRandomArrayElement(array) {
    if (!array || !array.length) {
      throw new Error('Cannot get random element from empty or undefined array');
    }
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Get a random boolean with a given probability
   * @param {number} [probability=0.5] - Probability of returning true (0-1)
   * @returns {boolean} Random boolean
   */
  function getRandomBoolean(probability = 0.5) {
    return Math.random() < probability;
  }
  
  /**
   * Generate a random string of given length
   * @param {number} length - Length of the string to generate
   * @param {string} [chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] - Characters to use
   * @returns {string} Random string
   */
  function getRandomString(length, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Get a random date between two dates
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {Date} Random date between start and end
   */
  function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
  
  module.exports = {
    getRandomInt,
    getRandomFloat,
    getRandomArrayElement,
    getRandomBoolean,
    getRandomString,
    getRandomDate
  };