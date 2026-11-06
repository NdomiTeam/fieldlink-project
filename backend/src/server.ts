import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import studentsRoutes from './routes/students.routes.js';
import fieldSpacesRoutes from './routes/field-spaces.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import { startConfirmationExpiryJob } from './jobs/confirmation-expiry.job.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;

// A browser's Origin header never has a trailing slash, but it's an easy
// mistake to paste FRONTEND_BASE_URL with one (e.g. copied from the
// address bar) — strip it so a stray slash doesn't silently break CORS.
const corsOrigin = process.env.FRONTEND_BASE_URL?.replace(/\/+$/, '') || '*';

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/field-spaces', fieldSpacesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api', documentsRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' });
});

startConfirmationExpiryJob();

app.listen(PORT, () => {
  console.log(`FieldLink backend listening on port ${PORT}`);
});
