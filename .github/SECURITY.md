# Security Policy

The SponsorPulse team takes the security of our extension and backend services seriously. 

## Supported Versions

We currently support the latest major version of the SponsorPulse extension on the Chrome Web Store, as well as the actively deployed `master` branch of the Hono backend.

| Component | Supported          |
| ------- | ------------------ |
| Chrome Extension (Manifest V3) | :white_check_mark: |
| Hono / Bun Server  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within SponsorPulse (such as XSS, unauthorized data access, API abuse, or rate-limit bypass), please DO NOT open a public issue.

Instead, please send a detailed email to `security@sponsorpulse.local` (or the repository owner). 

Please include:
* A detailed description of the vulnerability.
* Steps to reproduce the issue.
* The component affected (Extension, Background Worker, Server API, etc.).
* Any potential impact on users.

You can expect an initial response within 48 hours. We will keep you updated on the progress of the patch and will publicly disclose the issue only after a fix has been rolled out to the Chrome Web Store and our production servers.
