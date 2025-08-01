const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://interveu-io-assignment.onrender.com' 
    : 'http://localhost:3001'
};

export default config;
