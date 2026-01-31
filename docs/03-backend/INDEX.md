# Backend Documentation Index

Complete index of all backend documentation files.

## Main Documentation

- **[README.md](./README.md)** - Backend overview, quick start, and general information
- **[architecture.md](./architecture.md)** - Architecture patterns, design decisions, and best practices
- **[configuration.md](./configuration.md)** - Environment variables and configuration guide
- **[api-routes.md](./api-routes.md)** - Complete API endpoint reference

## Services

Documentation for all service layer classes:

- **[database-service.md](./services/database-service.md)** - Flashpoint database connection with hot-reload
- **[user-database-service.md](./services/user-database-service.md)** - User database with migrations
- **[auth-service.md](./services/auth-service.md)** - Authentication & JWT management (to be created)
- **[user-service.md](./services/user-service.md)** - User CRUD operations (to be created)
- **[role-service.md](./services/role-service.md)** - Role & permission management (to be created)
- **[game-service.md](./services/game-service.md)** - Game metadata queries (to be created)
- **[play-tracking-service.md](./services/play-tracking-service.md)** - Play session tracking (to be created)
- **[activity-service.md](./services/activity-service.md)** - Activity logging (to be created)

## Middleware

Documentation for all middleware components:

- **[authentication.md](./middleware/authentication.md)** - JWT verification middleware (to be created)
- **[rbac.md](./middleware/rbac.md)** - Permission checking middleware (to be created)
- **[error-handling.md](./middleware/error-handling.md)** - Global error handler (to be created)
- **[activity-logger.md](./middleware/activity-logger.md)** - Activity logging middleware (to be created)

## Database

Database schema and migration documentation:

- **[schema.md](./database/schema.md)** - Complete database schema reference (to be created)
- **[migrations.md](./database/migrations.md)** - Migration system explanation (to be created)
- **[data-models.md](./database/data-models.md)** - TypeScript types and interfaces (to be created)

## Documentation Status

### Completed

- ✅ README.md - Complete backend overview
- ✅ architecture.md - Architecture patterns and design
- ✅ configuration.md - Environment configuration
- ✅ api-routes.md - Complete API reference
- ✅ services/database-service.md - Flashpoint database service
- ✅ services/user-database-service.md - User database service

### To Be Created

The following documentation files should be created based on the codebase analysis:

#### Services

- **auth-service.md**: Authentication service (login, register, JWT)
- **user-service.md**: User management CRUD operations
- **role-service.md**: Role and permission management
- **game-service.md**: Game queries and search
- **play-tracking-service.md**: Play session tracking and statistics
- **activity-service.md**: Activity logging and retrieval

#### Middleware

- **authentication.md**: JWT authentication middleware
- **rbac.md**: Role-based access control middleware
- **error-handling.md**: Global error handler
- **activity-logger.md**: Activity logging middleware

#### Database

- **schema.md**: Complete database schema for both databases
- **migrations.md**: Migration system and how to create migrations
- **data-models.md**: TypeScript interfaces and types

## Quick Links

### Getting Started

1. Start here: [README.md](./README.md)
2. Set up environment: [configuration.md](./configuration.md)
3. Understand architecture: [architecture.md](./architecture.md)
4. API reference: [api-routes.md](./api-routes.md)

### Service Implementation

1. Database access: [database-service.md](./services/database-service.md), [user-database-service.md](./services/user-database-service.md)
2. Authentication: [auth-service.md](./services/auth-service.md)
3. User management: [user-service.md](./services/user-service.md)
4. Game queries: [game-service.md](./services/game-service.md)

### Security & Permissions

1. Authentication: [authentication.md](./middleware/authentication.md)
2. Authorization: [rbac.md](./middleware/rbac.md)
3. Activity tracking: [activity-logger.md](./middleware/activity-logger.md)

### Database

1. Schema reference: [schema.md](./database/schema.md)
2. Migration guide: [migrations.md](./database/migrations.md)
3. Type definitions: [data-models.md](./database/data-models.md)

## Documentation Templates

### Service Documentation Template

Each service documentation should include:

1. **Location** - File path in codebase
2. **Overview** - What the service does
3. **Key Features** - Main functionality
4. **Public API** - All public methods with parameters and return types
5. **Usage Examples** - Code examples for common operations
6. **Integration** - How it integrates with other services
7. **Best Practices** - Guidelines for using the service
8. **Related Documentation** - Links to related docs

### Middleware Documentation Template

Each middleware documentation should include:

1. **Location** - File path in codebase
2. **Purpose** - What the middleware does
3. **Usage** - How to apply it to routes
4. **Parameters** - Configuration options
5. **Examples** - Common usage patterns
6. **Error Handling** - What errors it throws
7. **Integration** - Order in middleware chain
8. **Related Documentation** - Links to related docs

## Contributing to Documentation

When adding or updating documentation:

1. **Follow the template** for consistency
2. **Include code examples** from actual codebase
3. **Link to related docs** for navigation
4. **Keep it concise** but complete
5. **Test all code examples** to ensure they work
6. **Update this index** when adding new files

## File Organization

```
docs/03-backend/
├── INDEX.md                    # This file
├── README.md                   # Backend overview
├── architecture.md             # Architecture documentation
├── configuration.md            # Configuration guide
├── api-routes.md              # API reference
│
├── services/                   # Service documentation
│   ├── database-service.md
│   ├── user-database-service.md
│   ├── auth-service.md
│   ├── user-service.md
│   ├── role-service.md
│   ├── game-service.md
│   ├── play-tracking-service.md
│   └── activity-service.md
│
├── middleware/                 # Middleware documentation
│   ├── authentication.md
│   ├── rbac.md
│   ├── error-handling.md
│   └── activity-logger.md
│
└── database/                   # Database documentation
    ├── schema.md
    ├── migrations.md
    └── data-models.md
```

## Related Project Documentation

- **[Frontend Documentation](../02-frontend/README.md)** - React frontend documentation
- **[Game Service Documentation](../04-game-service/README.md)** - Game content proxy service
- **[Project Overview](../01-overview/README.md)** - Overall project documentation

## Maintenance

This documentation should be updated when:

- New services are added
- New middleware is created
- API routes are added or changed
- Database schema is modified
- Configuration options change
- Architecture patterns are updated

Last updated: 2024-01-18
