# BullMQ End-to-End Test (Manual)

The adapter-level test suite (`apps/api/src/common/queue/__tests__/bullmq-queue.adapter.e2e-spec.ts`) covers all BullMQ adapter behaviour using `ioredis-mock` (in-memory Redis).  
However, two integration paths **cannot** be tested without a real Redis server:

1. **Job persistence across service restarts** — completed jobs remain in Redis and are not re-processed by a new worker.
2. **The `USE_BULLMQ=true` env-var path** — `DocumentBatchService.initQueue()` selects the BullMQ adapter only when this variable is set.

## Prerequisites

- Docker (or a local Redis 7+ instance on port 6379)
- `pnpm install` has been run (bullmq installed)

## Steps

```bash
# 1. Start Redis
docker run -d --name ths-redis -p 6379:6379 redis:7-alpine

# 2. (If not already installed) install dependencies
pnpm install

# 3. Start the API with BullMQ enabled
USE_BULLMQ=true REDIS_HOST=localhost REDIS_PORT=6379 \
  pnpm --filter @ths/api start:dev
```

### 3a. Verify initialization

Watch the API logs for:

```
[BullMQQueueAdapter] BullMQ queue "document-generation" initialized (Redis localhost:6379, concurrency: 3, maxRetries: 3)
```

If you see `Failed to initialize BullMQ queue` instead, check that Redis is reachable.

### 4. Create a batch

Send a POST request to create a document batch (e.g. KTA generation):

```bash
curl -X POST http://localhost:4000/api/documents/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"type": "kta", "memberIds": ["m-1", "m-2", "m-3"]}'
```

The response returns a `batchId`. Poll the batch status:

```bash
curl http://localhost:4000/api/documents/batch/<batchId> \
  -H "Authorization: Bearer <admin-token>"
```

### 5. Verify restart survival

While the batch is processing (some jobs still at `pending`):

```bash
# Kill the API process (Ctrl+C or docker stop)
# Wait 2 seconds, then restart
USE_BULLMQ=true REDIS_HOST=localhost REDIS_PORT=6379 \
  pnpm --filter @ths/api start:dev
```

Check that:
- Jobs that were **processing** before the restart are re-attempted (BullMQ's visibility timeout kicks in)
- Jobs that were **completed** are not re-processed
- The batch eventually reaches `completed` (or `completed_with_errors`)
- All `DocumentJob` records in the database have finalised statuses

### 6. Cleanup

```bash
docker stop ths-redis && docker rm ths-redis
```

## Architecture notes

| Component | Default (in-process) | BullMQ |
|---|---|---|
| Queue backend | In-memory Map | Redis |
| Job durability | Lost on restart | Survives restart |
| Horizontal scaling | Single process | Multiple workers |
| Retry mechanism | setTimeout loop | BullMQ built-in (exponential backoff) |
| Concurrency control | Semaphore | Worker.concurrency option |

The adapter selection is determined once at service initialisation. To switch back to the in-process adapter, unset `USE_BULLMQ` or set it to anything other than `'true'`:
