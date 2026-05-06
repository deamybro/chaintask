import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import './db/schema';
import bounties from './routes/bounties';
import users from './routes/users';
import webhook from './routes/webhook';
import { getRuntimeStatus, startRialoRuntime } from './rialo/runtime';

dotenv.config();

if (process.env.SEED_ON_START === 'true') {
  // Demo-hosting path: create starter identity, bounty, and escrow state when
  // the Render free instance boots with an empty local SQLite file.
  require('./db/seed');
}

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.use('/api', users);
app.use('/api', bounties);
app.use('/api', webhook);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'chaintask-rialo-simulation',
    ...getRuntimeStatus(),
    rialo_features_used: ['native_https_connectivity', 'reactive_transactions', 'escrow_pda', 'real_world_identity']
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    rialo_context: 'No matching contract instruction or account query exists for this request.'
  });
});

app.listen(port, () => {
  console.log(`[ChainTask API] listening on http://localhost:${port}`);
  startRialoRuntime();
});
