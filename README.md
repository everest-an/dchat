# Dchat Backend (Vercel Deployment)

This repository contains the backend service for the Dchat decentralized chat application, specifically configured for deployment on Vercel.

Dchat is a feature-rich chat platform built with a focus on Web3 and decentralized technologies. This backend is built using **Flask** (previously planned for FastAPI) and provides the core API services.

## Development Progress

The project is currently in the **Pre-Release Testing** phase. All core features have been implemented and are ready for testing.

Key recent activities include:

*   **Core Feature Implementation:** Completed LinkedIn OAuth, WebRTC, Polkadot Payments (including Red Packets), MFA, and ML Matching Engine.
*   **Vercel Deployment:** The application is being deployed to Vercel. We are actively resolving a persistent deployment configuration issue related to the Flask application structure on Vercel's Serverless Functions.
*   **Testing Framework:** A comprehensive unit and integration testing suite has been added.

For a detailed history of changes, please refer to the [commit history on GitHub](https://github.com/everest-an/SSP/commits/vercel-beta).

## Beta Testing Link

The latest stable deployment is available for testing. **Please note:** Due to Vercel's Preview URL retention policy, this link may become inactive over time.

**Beta API Endpoint:** `https://dchat-backend-vercel-dlpaidatm.vercel.app/`

**Health Check:** `https://dchat-backend-vercel-dlpaidatm.vercel.app/api/health`

## Key Features

*   **User Management & Authentication:** Secure user registration and login, **LinkedIn OAuth**, and **Multi-Factor Authentication (MFA)**.
*   **Messaging:** Core chat functionality, including one-on-one and group messaging.
*   **Real-time Communication:** **WebRTC** and LiveKit integration with **Call Quality Monitoring**.
*   **Web3 Integration:** Support for advanced features like:
    *   **Polkadot Payments** and **Red Packet** functionality.
    *   Subscriptions and Custodial Wallets.
*   **Smart Matching:** **Machine Learning Matching Engine** for intelligent user pairing.
*   **System Reliability:** **WebSocket Real-time Notifications**, **Automatic Refund Processor**, and **Structured Logging**.

## Deployment on Vercel

This project is set up to be deployed as a Serverless Function on Vercel using the `vercel.json` configuration.

The main entry point for the Vercel deployment is `api/index.py`, which imports the main Flask application instance (`app`) from `src/main.py`.

### Environment Variables

The following environment variables are required for a successful deployment:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `SECRET_KEY` | Application secret key for session management. | `a-strong-secret-key` |
| `DATABASE_URL` | Connection string for the database (e.g., Vercel Postgres). | `postgresql://user:pass@host:port/db` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins for CORS. | `https://dchat.app,http://localhost:3000` |

## Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/everest-an/SSP.git
    cd dchat_backend_vercel
    ```
2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the application:**
    ```bash
    python src/main.py
    ```
    The application will run locally, initializing a SQLite database file in `src/database/app.db`.

## API Endpoints

The health check endpoint is available at `/api/health`.
