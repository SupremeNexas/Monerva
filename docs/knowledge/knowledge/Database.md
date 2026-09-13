# Database

Related: [[API]], [[Backend]]

Tags: #postgres #prisma #schema

The PostgreSQL database:
* Running on port `5433` using rep-bound settings.
* Schema defined in `backend/prisma/schema.prisma`.
* Prisma Client manages queries, types, migrations, and seeding scripts.
* Follows cascade deletion rules for user profiles.
