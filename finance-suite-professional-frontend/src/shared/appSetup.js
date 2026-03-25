import apiClient from './apiClient';

// Initialize axios interceptors and app configuration
export const initializeApp = () => {
  // Set initial token if exists
  const token = localStorage.getItem('token');
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('App initialized with existing authentication token');
  } else {
    console.log('App initialized without authentication token');
  }
  
  // Add any other app initialization logic here
  console.log('Finance Suite app initialized successfully');
};

// Call this function when your app starts (in main.jsx or App.jsx)
export default initializeApp;