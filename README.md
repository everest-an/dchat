# Dchat Backend (Vercel Deployment)

This repository contains the backend service for the Dchat decentralized chat application, specifically configured for deployment on Vercel.

Dchat is a feature-rich chat platform built with a focus on Web3 and decentralized technologies. This backend is built using **Flask** and provides the core API services.

## Key Features

*   **User Management & Authentication:** Secure user registration and login, likely supporting wallet-based authentication (Web3).
*   **Messaging:** Core chat functionality, including one-on-one and group messaging.
*   **Group Management:** Creation and management of chat groups.
*   **File Handling:** API endpoints for file uploads and management (e.g., to IPFS).
*   **Web3 Integration:** Support for advanced features like:
    *   Web3 Groups and Payments (`groups_web3_bp`, `payments_web3_bp`)
    *   Polkadot Payments (`payments_polkadot_bp`)
    *   Tokens and NFT Avatars (`tokens_bp`, `nft_avatar_bp`)
    *   Subscriptions and Custodial Wallets (`subscription_bp`, `custodial_wallet_bp`)
*   **Real-time Communication:** WebRTC and LiveKit integration for potential voice/video calls.
*   **Error Handling & Security:** Includes custom middleware for authentication, rate limiting, and error handling.

## Deployment on Vercel

This project is set up to be deployed as a Serverless Function on Vercel using the `vercel.json` configuration.

The main entry point for the Vercel deployment is `api/index.py`, which imports the main Flask application instance (`app`) and the database initialization function (`init_db`) from `src/main.py`.

### Environment Variables

The following environment variables are required for a successful deployment:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `SECRET_KEY` | Flask application secret key for session management. | `a-strong-secret-key` |
| `DATABASE_URL` | Connection string for the database (e.g., Vercel Postgres). | `postgresql://user:pass@host:port/db` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins for CORS. | `https://dchat.app,http://localhost:3000` |

## Local Development

1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
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

```
