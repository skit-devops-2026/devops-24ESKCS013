const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
};
