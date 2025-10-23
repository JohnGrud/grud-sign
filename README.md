# GrudSign - Simple DocuSign-like Prototype

A minimal DocuSign-style workflow application that allows admins to upload PDFs, place signature fields, generate signing links, and enable recipients to sign documents digitally.

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9
- **Docker Desktop** (for LocalStack)
- **Git**

### 1. Clone & Setup

```bash
git clone <repository-url>
cd grud-sign

# Copy environment variables
cp .env.example .env

# Install dependencies
pnpm install
```

### 2. Start the Application

```bash
# Start everything (LocalStack + Backend + Frontend)
pnpm dev
```

This single command will:
- Start LocalStack (AWS services emulator)
- Create DynamoDB tables and S3 buckets
- Seed with demo data
- Start the backend API server (port 4000)
- Start the frontend development server (port 5173)

### 3. Access the Application

Once running, you'll see:

- **Admin Portal**: http://localhost:5173
- **Sample Sign Link**: http://localhost:5173/sign/demo-sign-token-001
- **Health Check**: http://localhost:4000/healthz

## 📋 Features

### Admin Features
- Upload PDF documents
- Place signature, text, and date fields on PDFs
- Generate secure signing links
- View and manage templates

### Signer Features
- Access documents via secure links
- Fill required fields (signature, text, date)
- Download signed PDF documents
- Mobile-friendly signing interface

### Technical Features
- **LocalStack Development**: Full AWS emulation locally
- **PDF Processing**: Real PDF field placement and flattening
- **TypeScript**: Full type safety across frontend/backend
- **Vue 3**: Modern reactive frontend
- **Express API**: RESTful backend with validation
- **Mono-repo**: Organized workspace structure

## 🏗️ Architecture

```
grud-sign/
├── frontend/          # Vue 3 + TypeScript + Tailwind
├── backend/           # Node.js + Express + TypeScript
├── packages/shared/   # Shared types and schemas
├── devops/           # LocalStack configuration
├── infra/            # AWS CDK (for production)
└── docs/             # Documentation
```

### Technology Stack

**Frontend:**
- Vue 3 with Composition API
- TypeScript
- Vite bundler
- Tailwind CSS
- PDF.js for PDF rendering
- Pinia for state management

**Backend:**
- Node.js 20+ with TypeScript
- Express.js framework
- AWS SDK v3 (DynamoDB, S3)
- pdf-lib for PDF processing
- Zod for schema validation
- Multer for file uploads

**Infrastructure:**
- LocalStack for local AWS emulation
- DynamoDB (single table design)
- S3 for file storage
- Docker Compose for orchestration

## 🔄 Development Workflow

### Admin Workflow
1. **Upload PDF** → `http://localhost:5173/upload`
2. **Place Fields** → Edit template to add signature fields
3. **Generate Link** → Create secure signing URL
4. **Share Link** → Send to recipient

### Signer Workflow
1. **Open Link** → Access signing session
2. **Review PDF** → View document with highlighted fields
3. **Fill Fields** → Complete required signature/text/date fields
4. **Submit** → Process and flatten PDF
5. **Download** → Get signed document

## 🛠️ API Endpoints

### Admin Endpoints (require `Authorization: Bearer dev-admin-token`)

```
POST /templates        # Create template with fields
GET  /templates/:id    # Get template details
GET  /templates        # List all templates
POST /signlinks       # Generate signing link
POST /files           # Upload PDF file
GET  /files/:id       # Get file URL
```

### Public Endpoints

```
GET  /sign/:token           # Get signing session
POST /sign/:token/submit    # Submit signed fields
GET  /healthz              # Health check
```

## 🗄️ Database Schema

Single DynamoDB table with GSI on `sk`:

```
Templates:     TEMPLATE#${id}  META
Fields:        TEMPLATE#${id}  FIELD#${fieldId}
SignLinks:     SIGNLINK#${token}  META
Audit:         AUDIT#${id}  META
Files:         FILE#${key}  META
```

## 📝 Environment Variables

```bash
# Development settings
NODE_ENV=development
ADMIN_TOKEN=dev-admin-token

# AWS LocalStack
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566

# Database & Storage
DDB_TABLE=grud-sign-main
S3_UPLOADS_BUCKET=grud-sign-uploads
S3_SIGNED_BUCKET=grud-sign-signed
S3_FORCE_PATH_STYLE=true

# Application
SIGN_BASE_URL=http://localhost:5173/sign
BACKEND_PORT=4000
FRONTEND_PORT=5173
```

## 🧪 Available Scripts

```bash
# Development
pnpm dev              # Start full stack
pnpm docker:up        # Start LocalStack only
pnpm docker:down      # Stop LocalStack
pnpm seed            # Seed demo data

# Building
pnpm build           # Build all packages
pnpm -r build        # Build each workspace

# Testing
pnpm test            # Run all tests
pnpm -r test         # Test each workspace
```

## 🐛 Troubleshooting

### LocalStack Issues

```bash
# Check LocalStack status
docker compose -f devops/docker-compose.yml ps

# View LocalStack logs
docker compose -f devops/docker-compose.yml logs localstack

# Reset LocalStack data
pnpm docker:down && pnpm docker:up
```

### Common Issues

**Port conflicts:**
- Frontend (5173), Backend (4000), LocalStack (4566)
- Change ports in `.env` if needed

**PDF not loading:**
- Check file was uploaded successfully
- Verify S3 presigned URL generation
- Check browser console for CORS errors

**Fields not saving:**
- Verify DynamoDB table exists: `awslocal dynamodb list-tables`
- Check field coordinates are within PDF bounds

## 🔒 Security Notes

This is a development prototype. For production:

- Implement proper authentication/authorization
- Add input validation and sanitization
- Use real SSL certificates
- Set up proper CORS policies
- Add rate limiting
- Implement audit logging
- Use secure session management

## 📦 Production Deployment

The `infra/` folder contains AWS CDK for production deployment:

```bash
cd infra
npm install
cdk deploy
```

This creates:
- DynamoDB table with GSI
- S3 buckets with proper policies
- Lambda functions for API
- API Gateway
- CloudWatch logging

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/grud-sign/issues)
- **Documentation**: Check the `/docs` folder
- **LocalStack Docs**: https://docs.localstack.cloud/

---

**Happy Signing!** 🖋️✨