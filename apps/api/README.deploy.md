# ChainTask API Deployment

Deploy this folder as the Railway service root.

Required environment variables:

```bash
PORT=3001
DATABASE_PATH=./chaintask.db
POLL_INTERVAL_MS=15000
GITHUB_TOKEN=
```

After the first deploy, run the seed command once from the Railway shell:

```bash
cd ../..
corepack pnpm --filter @chaintask/api seed
```

For persistent demo state, attach a Railway volume and set `DATABASE_PATH` to the mounted path, for example:

```bash
DATABASE_PATH=/data/chaintask.db
```
