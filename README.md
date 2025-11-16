# Dchat Backend (Vercel Deployment)

This repository contains the backend service for the Dchat decentralized chat application, specifically configured for deployment on Vercel.

Dchat is a feature-rich chat platform built with a focus on Web3 and decentralized technologies. This backend is built using **FastAPI** and provides the core API services.

## Development Progress

The project is currently in the active development phase. Key recent activities include:

*   **Refactoring to FastAPI:** The backend framework has been migrated from Flask to FastAPI for improved performance and modern features.
*   **Vercel Deployment:** The application is being deployed to Vercel. We are actively fixing deployment issues, primarily related to Python dependencies and environment configuration.
*   **Code Refinements:** The codebase is continuously being improved, with recent fixes for indentation errors and other syntax issues.

For a detailed history of changes, please refer to the [commit history on GitHub](https://github.com/everest-an/SSP/commits/vercel-beta).

## Key Features

*   **User Management & Authentication:** Secure user registration and login, likely supporting wallet-based authentication (Web3).
*   **Messaging:** Core chat functionality, including one-on-one and group messaging.
*   **Group Management:** Creation and management of chat groups.
*   **File Handling:** API endpoints for file uploads and management (e.g., to IPFS).
*   **Web3 Integration:** Support for advanced features like:
    *   Web3 Groups and Payments
    *   Polkadot Payments
    *   Tokens and NFT Avatars
    *   Subscriptions and Custodial Wallets
*   **Real-time Communication:** WebRTC and LiveKit integration for potential voice/video calls.
*   **Error Handling & Security:** Includes custom middleware for authentication, rate limiting, and error handling.

## Deployment on Vercel

This project is set up to be deployed as a Serverless Function on Vercel using the `vercel.json` configuration.

The main entry point for the Vercel deployment is `api/index.py`, which imports the main FastAPI application instance (`app`) from `src/main.py`.

### Environment Variables

The following environment variables are required for a successful deployment:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `SECRET_KEY` | FastAPI application secret key for session management. | `a-strong-secret-key` |
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
