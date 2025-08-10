// This file helps track all outgoing requests for debugging purposes

// Store the original fetch function
const originalFetch = window.fetch;

// Override the fetch function
window.fetch = async function(resource, init) {
  console.log('Outgoing request:', {
    url: resource,
    method: init?.method || 'GET',
    headers: init?.headers,
    body: init?.body
  });
  
  try {
    const response = await originalFetch(resource, init);
    console.log('Response for:', resource, response.status, response.statusText);
    return response;
  } catch (error) {
    console.error('Request failed:', resource, error);
    throw error;
  }
};

// Also log XMLHttpRequest
const originalXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function(method, url) {
  this._url = url;
  this._method = method;
  return originalXHROpen.apply(this, arguments);
};

const originalXHRSend = window.XMLHttpRequest.prototype.send;
window.XMLHttpRequest.prototype.send = function(body) {
  console.log('XHR Request:', {
    url: this._url,
    method: this._method,
    body: body
  });
  
  this.addEventListener('load', function() {
    console.log('XHR Response:', this._url, this.status, this.statusText);
  });
  
  return originalXHRSend.apply(this, arguments);
};

console.log('Request logger initialized');
