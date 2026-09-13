# Finova Security Policy

**Last Revised:** September 2026  
**Version:** 1.0  
**Operator:** [LEGAL_ENTITY_NAME_REQUIRED]

---

## 1. Security Architecture & Controls
Finova implements multi-layered security controls to protect user financial records:
- **Authentication:** JWT tokens with bcrypt password hashing (12 salt rounds) and Google OAuth 2.0 verification.
- **Tenant Isolation:** Mandatory `workspaceId` filtering on all database queries and transactions.
- **Input Sanitization:** Multi-pass regex sanitization against prompt injection, script injection, and unsafe control tokens.
- **RBAC & Authorization:** Role-based permission middleware enforcing ADMIN / MEMBER capabilities.

---

## 2. Reporting a Vulnerability
**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you have discovered a vulnerability (SQL injection, XSS, tenant bypass, secret exposure, or prompt injection bypass), please report it privately:
1. Email details and reproducible steps to **security@finova.app**.
2. Include a proof of concept (PoC) with instructions on how to reproduce the issue safely.
3. We will acknowledge your report within **24 hours** and coordinate a patch schedule.

---

## 3. Security Audits & Compliance
Full technical security audits, vector store security assessments, and data flow boundary maps are maintained in:
- [Security Audit](SECURITY_AUDIT.md)
- [Data Flow Map](DATA_FLOW_MAP.md)
