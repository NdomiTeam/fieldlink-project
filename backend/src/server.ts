import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import studentsRoutes from './routes/students.routes.js';
import fieldSpacesRoutes from './routes/field-spaces.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import fieldApplicationsRoutes from './routes/field-applications.routes.js';
import { startConfirmationExpiryJob } from './jobs/confirmation-expiry.job.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;

// Railway sits in front of this service as a reverse proxy (adds its own
// X-Forwarded-For). Without this, express-rate-limit throws on every
// request instead of rate-limiting it, since it can't tell which hop of
// X-Forwarded-For to trust - this broke every rate-limited route (login
// included) with a generic 500.
app.set('trust proxy', true);

// A browser's Origin header is exactly scheme+host+port: no trailing
// slash, no surrounding whitespace. Both are easy mistakes when pasting
// FRONTEND_BASE_URL into a dashboard (trailing slash from the address
// bar, a stray newline/space from the paste itself) and either one
// made cors() throw "Invalid character in header content" on every
// single request, not just cross-origin ones.
const corsOrigin = process.env.FRONTEND_BASE_URL?.trim().replace(/\/+$/, '') || '*';

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/field-spaces', fieldSpacesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api', documentsRoutes);
app.use('/api/field-applications', fieldApplicationsRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' });
});

startConfirmationExpiryJob();

app.listen(PORT, () => {
  console.log(`FieldLink backend listening on port ${PORT}`);
});
