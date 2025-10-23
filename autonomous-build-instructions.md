# **2\) FILLED EXAMPLE — “Simple DocuSign-like” Prototype (LocalStack dev, no questions)**

**Instruction to Model**  
 YOLO Mode. Do not ask questions. Build a working prototype per spec below, using sensible choices. In **dev**, use **LocalStack** for **DynamoDB \+ S3**. In **cloud**, CDK targets AWS. Defaults and endpoints are provided via `.env`. If something is ambiguous, decide and proceed.

## **B — Behavior / Brief**

* **App name:** grud-sign

* **One-liner:** Minimal DocuSign-style workflow: admin uploads a PDF and places signature fields; recipient opens a link, signs, and downloads a flattened PDF; audit is recorded.

* **Users & goals:**

  1. **Admin**: upload PDF, place fields, generate sign link.

  2. **Signer**: open link, fill required fields, finish, download signed PDF.

* **Platforms:** Web frontend \+ REST API \+ AWS IaC (CDK v2, TypeScript).

* **MVP:**

  1. PDF upload & viewer with draggable signature/text/date fields.

  2. Save template (field defs \+ page coords) to DynamoDB.

  3. Generate signer link; signer fills; server flattens PDF; store signed file in S3; audit logs.

## **M — Milestones / Mode of Operation**

* **Delivery mode:** Mono-repo. One command starts LocalStack, seeds Dynamo/S3, and runs FE/BE with a demo flow.

* **Milestones:** M1 scaffolding → M2 schema → M3 API → M4 FE flows → M5 PDF pipeline → M6 tests & docs.

* **Done when:** `pnpm dev` brings up LocalStack \+ app; admin can upload/place fields/save, generate link, sign, and download flattened PDF; tests pass.

## **A — Actions / Architecture**

* **Tech stack (locked):**

  * **Frontend:** Vue 3 (Vite, TypeScript, Pinia), Tailwind, vue-router, PDF.js, `vue-draggable-resizable`.

  * **Backend:** Node 20 \+ TypeScript. For **dev**, run as local Express/Fastify app. For **cloud**, Lambda behind API Gateway (via CDK).

  * **PDF Processing:** `pdf-lib` for read/write/flatten (server-side only).

  * **Database (dev):** **DynamoDB on LocalStack** (`http://localhost:4566`).

  * **Object storage (dev):** **S3 on LocalStack** (`http://localhost:4566`).

  * **IaC:** AWS CDK v2 TypeScript (for real AWS deploy; dev uses LocalStack).

* **Local emulation with LocalStack:**

  * Enable services: `dynamodb`, `s3`, `sts`, `iam`, `cloudwatch-logs`.

  * Use **path-style S3** in dev (for LocalStack).

  * Use `AWS_ENDPOINT=http://localhost:4566` for AWS SDK v3 clients in dev.

**Repo layout (updated with LocalStack assets):**

 `grud-sign/`  
  `frontend/`  
    `src/pages/{AdminUpload.vue, AdminPlaceFields.vue, AdminTemplates.vue, Signer.vue}`  
    `src/components/{PdfCanvas.vue, FieldPalette.vue, FieldBox.vue, Toolbar.vue}`  
    `src/store/`  
    `src/lib/pdf/`  
    `vite.config.ts`  
    `package.json`  
  `backend/`  
    `src/handlers/{templates.ts,signlinks.ts,signing.ts,files.ts,health.ts}`  
    `src/lib/{ddb.ts,s3.ts,schema.ts,pdf.ts,auth.ts,env.ts}`  
    `src/local-server.ts`  
    `package.json`  
  `infra/`  
    `bin/infra.ts`  
    `lib/stack.ts`  
    `package.json`  
  `packages/shared/`  
    `src/types.ts`  
    `package.json`  
  `devops/`  
    `docker-compose.yml`  
    `localstack-init.sh`  
    `seed.ts`  
  `.env.example`  
  `package.json`  
  `README.md`  
  `turbo.json or pnpm workspaces (optional)`

* **Scripts (root):**

  * `"dev": "pnpm -r build && pnpm docker:up && pnpm seed && concurrently -k \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\""`

  * `"docker:up": "docker compose -f devops/docker-compose.yml up -d --wait && bash devops/localstack-init.sh"`

  * `"docker:down": "docker compose -f devops/docker-compose.yml down -v"`

  * `"seed": "tsx devops/seed.ts"`

  * `"build": "pnpm -r build"`

  * `"test": "pnpm -r test"`

* **Backend dev script:**

  * `"dev": "tsx src/local-server.ts"`

* **API (stable):**

  * `GET /healthz` → `{ ok: true }`

  * `POST /templates` (admin) — `{ name, file (multipart) | fileId, fields: FieldDef[] }` → `{ templateId }`

  * `GET /templates/:id` (admin) → `{ template }`

  * `POST /signlinks` (admin) — `{ templateId, signerEmail?, expiresAt? }` → `{ signUrl, token }`

  * `GET /sign/:token` (public) → `{ fileUrl, fields }`

  * `POST /sign/:token/submit` (public) — `{ filled: FieldValue[] }` → `{ signedFileUrl, auditId }`

* **Security:**

  * Admin: `Authorization: Bearer ${ADMIN_TOKEN}` from `.env`.

  * Signer: one-time token, TTL enforced; Zod validation for all inputs.

  * Minimal PII; redact logs.

* **Observability:** Structured logs, `/healthz`.

## **D — Data / Domain (single-table; GSI constraint honored)**

* **DynamoDB single-table:** **No new GSIs** beyond existing **GSI on `sk`**.

  * **Table:** `grud-sign-main`

  * **Keys:** `pk` (partition), `sk` (sort). **GSI1**: partition on `sk`.

  * **Items:**

    * Template: `pk=TEMPLATE#${templateId}`, `sk=META` → `{ templateId, name, fileKey, createdAt }`

    * TemplateField: `pk=TEMPLATE#${templateId}`, `sk=FIELD#${fieldId}` → coords/types

    * SignLink: `pk=SIGNLINK#${token}`, `sk=META` → `{ templateId, status, expiresAt }` and mirror `pk=TEMPLATE#${templateId}`, `sk=SIGNLINK#${token}`

    * Audit: `pk=AUDIT#${auditId}`, `sk=META` → `{ templateId, token, ip, ua, timestamps }`

    * File: `pk=FILE#${fileKey}`, `sk=META` → `{ bucket, key, mime, bytes? }` (dev may omit `bytes`)

* **S3 buckets:**

  * `grud-sign-uploads` (raw PDFs)

  * `grud-sign-signed` (flattened results)

* **Zod schemas:** `packages/shared/src/types.ts` shared FE/BE.

## **Non-interactive Defaults & Assumptions**

* **Timezone:** America/Detroit

* **Region:** us-east-1

* **LocalStack endpoint:** `http://localhost:4566`

* **S3 path-style:** true (for LocalStack)

* **PDF limits:** 10 MB; 50 pages

* **Forbidden:** New GSIs; paid third-party services.

## **Developer Experience (updated for LocalStack)**

* **README:** Include quickstart with Docker Desktop, `pnpm dev`, how to access LocalStack UI (if installed), troubleshooting tips.

**`.env.example` (update to include LocalStack \+ S3):**

 `NODE_ENV=development`  
`ADMIN_TOKEN=dev-admin-token`

`AWS_REGION=us-east-1`  
`AWS_ACCESS_KEY_ID=test`  
`AWS_SECRET_ACCESS_KEY=test`  
`AWS_ENDPOINT=http://localhost:4566`

`DDB_TABLE=grud-sign-main`

`S3_UPLOADS_BUCKET=grud-sign-uploads`  
`S3_SIGNED_BUCKET=grud-sign-signed`  
`S3_FORCE_PATH_STYLE=true`

`SIGN_BASE_URL=http://localhost:5173/sign`  
`BACKEND_PORT=4000`  
`FRONTEND_PORT=5173`

* 

**`devops/docker-compose.yml` (create):**

 `services:`  
  `localstack:`  
    `image: localstack/localstack:latest`  
    `ports:`  
      `- "4566:4566"`  
      `- "4510-4559:4510-4559"`  
    `environment:`  
      `- SERVICES=s3,dynamodb,sts,iam,cloudwatch,cloudwatch-logs`  
      `- DEFAULT_REGION=us-east-1`  
      `- AWS_ACCESS_KEY_ID=test`  
      `- AWS_SECRET_ACCESS_KEY=test`  
      `- DEBUG=0`  
    `volumes:`  
      `- "localstack-data:/var/lib/localstack"`  
      `- "/var/run/docker.sock:/var/run/docker.sock"`  
`volumes:`  
  `localstack-data:`

* 

**`devops/localstack-init.sh` (create):** *(idempotent)*

 `#!/usr/bin/env bash`  
`set -euo pipefail`

`export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test}`  
`export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test}`  
`export AWS_DEFAULT_REGION=${AWS_REGION:-us-east-1}`  
`EP=${AWS_ENDPOINT:-http://localhost:4566}`

`# Create Dynamo table if not exists`  
`if ! awslocal dynamodb describe-table --table-name grud-sign-main >/dev/null 2>&1; then`  
  `awslocal dynamodb create-table \`  
    `--table-name grud-sign-main \`  
    `--attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \`  
    `--key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \`  
    `--billing-mode PAY_PER_REQUEST \`  
    `--global-secondary-indexes '[`  
      `{`  
        `"IndexName": "GSI1",`  
        `"KeySchema": [{"AttributeName":"sk","KeyType":"HASH"}],`  
        `"Projection":{"ProjectionType":"ALL"},`  
        `"ProvisionedThroughput":{"ReadCapacityUnits":1,"WriteCapacityUnits":1}`  
      `}`  
    `]'`  
`fi`

`# Create S3 buckets if not exist`  
`for B in grud-sign-uploads grud-sign-signed; do`  
  `if ! awslocal s3 ls "s3://$B" >/dev/null 2>&1; then`  
    `awslocal s3 mb "s3://$B"`  
  `fi`  
`done`  
`echo "LocalStack initialized."`

* 

**`backend/src/lib/env.ts` (create):** centralize dev/cloud config

 `export const env = {`  
  `region: process.env.AWS_REGION ?? 'us-east-1',`  
  `endpoint: process.env.AWS_ENDPOINT, // e.g., http://localhost:4566 in dev`  
  `table: process.env.DDB_TABLE ?? 'grud-sign-main',`  
  `uploadsBucket: process.env.S3_UPLOADS_BUCKET ?? 'grud-sign-uploads',`  
  `signedBucket: process.env.S3_SIGNED_BUCKET ?? 'grud-sign-signed',`  
  `pathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',`  
  `adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',`  
  `port: Number(process.env.BACKEND_PORT ?? 4000),`  
`};`

* 

**`backend/src/lib/ddb.ts` (update):** AWS SDK v3 with endpoint override

 `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";`  
`import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";`  
`import { env } from "./env";`

`const ddb = new DynamoDBClient({`  
  `region: env.region,`  
  `...(env.endpoint ? { endpoint: env.endpoint } : {}),`  
`});`  
`export const ddbDoc = DynamoDBDocumentClient.from(ddb, {`  
  `marshallOptions: { removeUndefinedValues: true },`  
`});`

* 

**`backend/src/lib/s3.ts` (update):** S3 v3 with path-style for LocalStack

 `import { S3Client } from "@aws-sdk/client-s3";`  
`import { env } from "./env";`

`export const s3 = new S3Client({`  
  `region: env.region,`  
  `forcePathStyle: env.pathStyle,`  
  `...(env.endpoint ? { endpoint: env.endpoint } : {}),`  
`});`

*   
* **Seeding (`devops/seed.ts`):**

  * Upload `sample.pdf` to `grud-sign-uploads`.

  * Create a Template \+ a few TemplateField items.

  * Create a SignLink with short TTL.

  * Print a ready URL, e.g. `http://localhost:5173/sign/<token>`.

* **Backend `files.ts` handler (update):**

  * Store raw uploads to `S3_UPLOADS_BUCKET`.

  * Store flattened PDF to `S3_SIGNED_BUCKET`.

  * For dev, expose presigned GET URLs via LocalStack endpoint.

## **Frontend Flows (unchanged)**

Admin Upload → Place Fields → Templates List → Generate Link → Signer Page → Download signed PDF (from `grud-sign-signed`).

## **Backend Handlers (unchanged contracts)**

`POST /templates`, `POST /signlinks`, `GET /sign/:token`, `POST /sign/:token/submit` with S3/DDB persistence using the LocalStack endpoint in dev.

## **Cloud Infra (CDK) Notes**

* Keep CDK stack for AWS (DynamoDB table, S3 buckets, Lambdas, API GW).

* **Dev uses LocalStack only**; CDK deploy is optional.

* If desired later, you can integrate `cdklocal` for LocalStack CDK synth/deploy, but this spec uses Docker \+ `awslocal` for simplicity.

---

## **What you (the model) must output immediately**

1. **Complete mono-repo** with the LocalStack files above.

2. **All source files** compiling and runnable.

3. **README.md** with quickstart:

   * `cp .env.example .env`

   * `pnpm i`

   * `pnpm dev` (brings up LocalStack, initializes table/buckets, seeds demo, runs FE/BE)

4. **.env.example** (as given).

5. **Seed script** that prints a local signer URL.

6. **Minimal tests** for schema validation and token lifecycle.

Proceed to generate the code now with LocalStack integration as specified. Do not ask questions.
