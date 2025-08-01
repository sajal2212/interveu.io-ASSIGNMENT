const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-render-backend-url.onrender.com'  // Replace with your actual Render URL
    : 'http://localhost:3001'
};

export default config;
