# Deployment

Related: [[Database]], [[API]]

Tags: #devops #docker #render

Deployment infrastructure details:
* Local: PostgreSQL Docker container on port `5433` controlled by `run_db.sh`.
* Production: `render.yaml` orchestration file deploying managed Postgres, Express REST API, and static Vite frontends on Render.
