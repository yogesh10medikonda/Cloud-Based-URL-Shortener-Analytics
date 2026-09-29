
# Cloud-Based URL Shortener & Analytics

A full-stack URL shortening application built with **React, Node.js, Express and MongoDB**, containerized with **Docker** and deployed on **Render**.

The project combines REST API development, JWT authentication, link management, click tracking and cloud deployment. It also includes ongoing work on detailed analytics and CI/CD.

## Live Application

- **Frontend:** Add your Render Static Site URL here
- **Backend:** Add your Render Web Service URL here
- **Repository:** https://github.com/yogesh10medikonda/url-shortener

## Features

- **URL Shortening:** Convert long URLs into short, shareable links.
- **User Authentication:** Secure signup and login using JWT.
- **User Dashboard:** View and manage shortened URLs.
- **Link Expiration:** Set expiration dates for generated links.
- **Click Tracking:** Monitor the total number of visits to each link.
- **Redis Caching:** Cache frequently accessed URLs to improve redirect performance when Redis is configured.
- **Containerization:** Run the backend and supporting services locally using Docker Compose.
- **Cloud Hosting:** Deploy the frontend and backend separately on Render.

### Analytics Extension

Additional analytics functionality is under development and integration testing:

- Individual click records
- Daily click statistics
- Popular-link reporting
- Historical analytics charts

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT) |
| Caching | Redis |
| Containerization | Docker, Docker Compose |
| Cloud Hosting | Render |
| CI | GitHub Actions |
| Version Control | Git, GitHub |

## System Architecture

```text
                  User / Browser
                        |
                        v
                 React Frontend
               Render Static Site
                        |
                  HTTPS Requests
                        |
                        v
                 Express REST API
               Render Web Service
                        |
              +---------+---------+
              |                   |
              v                   v
         MongoDB Atlas       Redis Cache
         Persistent Data     When Configured
```

The React frontend communicates with the Express backend through REST APIs. MongoDB stores application data, while Redis can accelerate frequently requested redirects.

## Project Structure

```text
url-shortener/
|
|-- frontend/
|   |-- src/
|   |-- package.json
|
|-- src/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- app.js
|
|-- middleware/
|   |-- config/
|
|-- .github/
|   |-- workflows/
|
|-- Dockerfile
|-- docker-compose.yml
|-- package.json
|-- README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js and npm
- Git
- Docker Desktop (optional)
- Access to a MongoDB database

### 1. Clone the Repository

```bash
git clone https://github.com/yogesh10medikonda/url-shortener.git
cd url-shortener
```

### 2. Configure Environment Variables

Create a `.env` file in the project root.

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret

REDIS_URL=redis://localhost:6379
```

Replace the placeholder values with your own configuration.

Never commit passwords, tokens or `.env` files to GitHub.

### 3. Start the Backend

```bash
npm install
npm run dev
```

The backend normally runs at:

```text
http://localhost:5000
```

### 4. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local address displayed by Vite, usually:

```text
http://localhost:5173
```

### 5. Configure the Frontend API

For local development, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

For cloud deployment, set `VITE_API_URL` to the public backend URL in your hosting platform.

### 6. Run with Docker

With Docker Desktop running and the required environment variables configured:

```bash
docker compose up --build
```

Docker Compose starts the services defined in `docker-compose.yml`.

## Cloud Deployment

The application uses Render for cloud hosting and MongoDB Atlas for database storage.

| Component | Deployment |
|---|---|
| React frontend | Render Static Site |
| Express backend | Render Web Service |
| Database | MongoDB Atlas |
| Redis | Local Docker setup; hosted caching optional |

### Backend Configuration

The deployed backend requires environment variables such as:

```text
NODE_ENV
MONGO_URI
JWT_SECRET
REDIS_URL (if hosted Redis is enabled)
```

The application should use the `PORT` environment variable supplied by its hosting platform.

### Frontend Configuration

Set the following variable in the Render Static Site:

```text
VITE_API_URL=https://your-backend.onrender.com
```

The production backend must also allow requests from the deployed frontend's origin through its CORS configuration.

## CI/CD

The repository includes work on a GitHub Actions workflow intended to:

- Install backend dependencies.
- Check JavaScript syntax.
- Build the backend Docker image.
- Run automatically on configured GitHub events.

The workflow should be verified through the repository's GitHub Actions page.

## Development and Contributions

This project originated as a collaborative URL shortening application. The original core included authentication, URL shortening and link expiration.

**My contributions include:**

- Resolving merge conflicts and backend integration issues.
- Fixing database, Redis and authentication configuration paths.
- Creating the Docker and Docker Compose setup.
- Configuring MongoDB Atlas for cloud hosting.
- Deploying the Express backend and React frontend on Render.
- Configuring production environment variables.
- Developing additional click analytics functionality.
- Working on GitHub Actions CI and production integration.

The original application functionality is credited to my teammate. The subsequent development and deployment work reflects my independent contributions.

## Future Improvements

- Complete and verify daily and weekly analytics.
- Add interactive analytics charts.
- Integrate hosted Redis caching.
- Expand automated API tests.
- Add deployment monitoring and error reporting.
- Implement custom domains and QR code generation.
- Explore AWS deployment.

## Author

**Medikonda Yogesh Reddy**

Computer and Communication Engineering student  
Interested in Software Development and Cloud Computing

GitHub: https://github.com/yogesh10medikonda

## Acknowledgments

Thanks to my teammate for developing the original URL shortening functionality. This project has since been extended through independent backend, DevOps, analytics and cloud deployment work.