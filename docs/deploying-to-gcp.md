# Deploying to GCP Cloud Run

This guide walks through deploying the app to Cloud Run with a CloudSQL Postgres database.

## Prerequisites

Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), then authenticate and set your project:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 1. Create CloudSQL Postgres Instance

```bash
gcloud sql instances create ayegee-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

Set the postgres user password:

```bash
gcloud sql users set-password postgres \
  --instance=ayegee-db \
  --password=YOUR_PASSWORD
```

Create the database:

```bash
gcloud sql databases create ayegee --instance=ayegee-db
```

## 2. Deploy to Cloud Run

Deploy with a single command:

```bash
gcloud run deploy ayegee \
  --source . \
  --region=us-central1 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:ayegee-db \
  --set-env-vars="INSTANCE_CONNECTION_NAME=YOUR_PROJECT_ID:us-central1:ayegee-db,DB_USER=postgres,DB_PASSWORD=YOUR_PASSWORD,DB_NAME=ayegee" \
  --allow-unauthenticated
```

This command:

- Builds the Docker image using Cloud Build
- Pushes it to Artifact Registry
- Deploys to Cloud Run
- Configures the CloudSQL connection via `--add-cloudsql-instances` (mounts the socket at `/cloudsql/...`)

## 3. Verify Deployment

Get the service URL:

```bash
gcloud run services describe ayegee --region=us-central1 --format='value(status.url)'
```

Test the health endpoint:

```bash
curl https://YOUR_SERVICE_URL/health
```

## Cost Considerations

| Resource | Cost |
|----------|------|
| CloudSQL `db-f1-micro` | ~$7/month |
| Cloud Run | Pay-per-request (free tier: 2M requests/month) |

## Production Recommendations

- Use Secret Manager for database credentials instead of environment variables
- Set `--min-instances=1` to avoid cold starts
- Upgrade to a larger CloudSQL tier for production workloads
- Enable Cloud SQL connection pooling for high traffic
