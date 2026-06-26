# SLT Network KPI

## Project Overview

SLT Network KPI is a full-stack KPI management platform used to track, manage, and report network-related performance metrics. The solution is split into a backend API and a frontend application that work together to provide KPI dashboards, data entry, reporting, and authentication-based access control.

## Tech Stack

### Backend
- ASP.NET Core
- C#
- Entity Framework Core
- SQL Server
- JWT-based authentication

### Frontend
- Angular
- TypeScript
- SCSS / CSS
- RxJS
- Angular Router

### Development Tools
- .NET SDK
- Node.js / npm
- Angular CLI
- Git

## Project Folder Structure

```text
slt-network-kpi/
├── backend/              # ASP.NET Core API project
│   ├── Controllers/      # API controllers
│   ├── Data/             # Database context and data access
│   ├── DTOs/             # Data transfer objects
│   ├── Helpers/          # Utility classes and authorization helpers
│   ├── Migrations/       # Entity Framework migrations
│   ├── Models/           # Domain models
│   ├── Services/         # Application services
│   └── Program.cs        # Application entry point
├── frondend/             # Angular frontend project
│   ├── src/app/          # Angular components, services, guards, and routes
│   ├── src/assets/       # Static assets such as images and fonts
│   ├── src/environments/ # Environment configuration files
│   └── package.json      # Frontend dependencies and scripts
└── Readme.md             # Project documentation
