# Authentication

Related: [[API]], [[Database]], [[Frontend]]

Tags: #security #auth #google

Manages user sessions and identity:
* JWT auth: Exposes 15-minute access tokens in-memory and 7-day refresh tokens in `localStorage`.
* Google OAuth: Verifies Google Identity Services ID tokens on the server using the official Google library client.
