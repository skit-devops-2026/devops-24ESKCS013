import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// API routes
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Nexus API is running' });
});

app.use('/api', apiRouter);

export default app;
