# @ths-thm/api-client

Auto-generated TypeScript client for the THS-THM API, built from the OpenAPI/Swagger specification.

## Overview

This package automatically generates type-safe API client code from the backend's Swagger/OpenAPI specification. This ensures 100% type synchronization between the NestJS API and all frontend consumers (Web, Mobile).

## Prerequisites

1. The API server must be running locally on `http://localhost:3001`
2. Swagger must be enabled (non-production environment)

## Usage

### 1. Generate Client Types

```bash
# From the root or packages/api-client
pnpm --filter @ths-thm/api-client generate
```

This fetches the OpenAPI spec from `http://localhost:3001/api-json` and generates `src/index.ts`.

### 2. Build the Package

```bash
pnpm --filter @ths-thm/api-client build
```

### 3. Consume in Apps

#### Web (React)

```typescript
import createClient from 'openapi-fetch';
import type { paths } from '@ths-thm/api-client';

const client = createClient<paths>({ baseUrl: '/api' });

// Fully typed request/response
const { data, error } = await client.GET('/users', {
  params: { query: { page: 1, limit: 10 } }
});
```

#### Mobile (React Native)

```typescript
import createClient from 'openapi-fetch';
import type { paths } from '@ths-thm/api-client';

const client = createClient<paths>({ baseUrl: 'http://localhost:3001/api' });

const { data } = await client.POST('/auth/login', {
  body: { identifier: 'user@example.com', password: 'secret' }
});
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Generate API Client
  run: |
    cd apps/api && pnpm start &
    sleep 5
    pnpm --filter @ths-thm/api-client generate
    pnpm --filter @ths-thm/api-client build
  env:
    NODE_ENV: development
```

## Architecture

```
packages/api-client/
├── src/
│   └── index.ts         # Auto-generated types (DO NOT EDIT MANUALLY)
├── package.json
└── tsconfig.json
```

## Benefits

- **Type Safety**: Compile-time checking of all API requests/responses
- **Auto-sync**: Regenerate when API changes; breaking changes become compile errors
- **Documentation**: Generated types serve as inline API documentation
- **Consistency**: Single source of truth shared across Web, Mobile, and tests