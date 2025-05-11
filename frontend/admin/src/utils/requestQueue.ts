/**
 * Simple API client that adds a delay between requests to prevent token rotation issues
 * This is a simpler approach than a full request queue
 */

// Track the last request time
let lastRequestTime = 0;
// Minimum time between requests in milliseconds
const MIN_REQUEST_DELAY = 500; 

/**
 * Make an authenticated API request with a delay between requests
 * to prevent token rotation conflicts
 */
export const queuedFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  // Calculate how long to wait before making this request
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const delayNeeded = Math.max(0, MIN_REQUEST_DELAY - timeSinceLastRequest);
  
  // If needed, wait before making the request
  if (delayNeeded > 0) {
    console.log(`Waiting ${delayNeeded}ms before making request to ${url}`);
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  // Update the last request time
  lastRequestTime = Date.now();
  
  // Get the latest token
  const accessToken = localStorage.getItem('accessToken');
  
  // Prepare request options
  const requestOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };
  
  // Add authorization header if token exists
  if (accessToken) {
    requestOptions.headers = {
      ...requestOptions.headers,
      'Authorization': accessToken
    };
  }
  
  try {
    // Make the request
    const response = await fetch(url, requestOptions);
    
    // Parse the response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    
    // Handle error responses
    if (!response.ok) {
      throw {
        status: response.status,
        statusText: response.statusText,
        data
      };
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};
