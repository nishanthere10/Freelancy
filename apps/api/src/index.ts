/**
 * Freelance OS API
 * Main entry point for the backend server
 */

import express, { type Application } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Basic routes placeholder
app.get('/', (req, res) => {
  res.json({ message: 'Freelance OS API v1' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
