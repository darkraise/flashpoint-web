# Project Overview

## Introduction

Flashpoint Web is a self-hosted web application designed to browse and play
games from the Flashpoint Archive. It provides a modern, user-friendly interface
to access thousands of preserved Flash games, HTML5 games, and animations from
the early web era.

## What is Flashpoint?

[Flashpoint](https://flashpointarchive.org/) is a community preservation project
dedicated to saving games and animations from the web. With Adobe Flash Player's
end-of-life in December 2020, millions of Flash games and animations became
unplayable. Flashpoint preserves these games and provides tools to play them.

## What is Flashpoint Web?

Flashpoint Web is a **web-based alternative** to the Flashpoint Launcher,
offering:

- **Browser-based access** to your local Flashpoint collection
- **Modern UI** built with React and Tailwind CSS
- **Advanced search and filtering** for thousands of games
- **Play session tracking** with statistics and analytics
- **User management** with role-based access control
- **Playlist management** for organizing favorite games
- **Responsive design** that works on desktop and mobile

## Key Features

### Game Browsing & Search

- **Comprehensive filtering** by platform, developer, publisher, series, tags,
  year, and more
- **Fast search** across 70,000+ games in the archive
- **Multiple view modes** (grid/list) with customizable layouts
- **Related games** suggestions based on developer and platform
- **Random game** discovery feature

### Game Playing

- **Flash games** using Ruffle WebAssembly emulator (no plugin required)
- **HTML5 games** running natively in the browser
- **Fullscreen mode** with keyboard controls
- **Embedded player** or dedicated player view
- **Platform compatibility detection**

### User Features

- **User authentication** with JWT-based security
- **Role-based permissions** (admin, moderator, user, guest)
- **Play session tracking** with duration and completion status
- **Play statistics** showing top games, playtime, and activity
- **Favorites and playlists** for organizing games
- **Theme customization** with 22 color palettes and dark/light modes

### Administration

- **User management** with role assignment
- **Permission system** with granular access control
- **Activity logging** for audit trails
- **Auth settings** configuration (guest access, registration, lockout policies)
- **Database hot-reloading** when Flashpoint Launcher updates metadata

## Architecture Highlights

Flashpoint Web consists of two independent services:

1. **Backend (Port 3100)** - REST API server handling game metadata, user
   management, authentication, and game file serving
2. **Frontend (Port 5173)** - React web application providing the user interface

This separation allows:

- Clear separation of concerns
- Backend handles both metadata and game content
- Frontend focuses on user interface and client-side state
- Simplified deployment with fewer containers

## Technology Stack Summary

- **Backend**: Node.js, Express, TypeScript, SQLite (BetterSqlite3), JWT, bcrypt,
  node-stream-zip
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind
  CSS, Shadcn UI
- **Game Emulation**: Ruffle (Flash), Native Browser (HTML5)

## Use Cases

### Home Users

- Browse and play your personal Flashpoint collection from any device on your
  local network
- Track your playtime and discover new games
- Create playlists for organizing favorites

### Multi-User Households

- Individual user accounts with separate play statistics
- Guest mode for temporary access
- User registration for creating accounts

### Educational Institutions

- Preserve and provide access to educational Flash content
- Track student engagement with educational games
- Role-based access for teachers and students

### Game Preservationists

- Access comprehensive metadata from Flashpoint's preservation efforts
- Contribute to playlists and curation
- Integration with existing Flashpoint installations

## Project Goals

1. **Preservation** - Support the Flashpoint mission of preserving web games and
   animations
2. **Accessibility** - Make preserved content easy to access via modern web
   interfaces
3. **User Experience** - Provide intuitive, responsive UI for browsing and
   playing
4. **Extensibility** - Modular architecture allowing future enhancements
5. **Performance** - Fast searches, efficient file serving, responsive UI
6. **Security** - Secure authentication, permission system, audit logging

## Comparison with Flashpoint Launcher

| Feature        | Flashpoint Launcher           | Flashpoint Web                  |
| -------------- | ----------------------------- | ------------------------------- |
| Platform       | Desktop (Windows, Linux, Mac) | Web browser                     |
| Interface      | Desktop application           | Web application                 |
| Game Support   | All platforms                 | Flash, HTML5 (browser-playable) |
| Authentication | Single user                   | Multi-user with RBAC            |
| Play Tracking  | Local only                    | Per-user with statistics        |
| Remote Access  | No                            | Yes (local network)             |
| Search/Filter  | Basic                         | Advanced with multiple criteria |
| Playlists      | Launcher-managed              | User-created, favorites         |
| Updates        | Manual                        | Database hot-reload             |

## License

Flashpoint Web is open-source software. (Note: Add appropriate license
information)

## Credits

- **Flashpoint Project** - For the incredible game preservation work
- **Ruffle** - For the Flash emulator technology
- **Community Contributors** - For testing, feedback, and contributions

## Getting Started

Ready to dive in?

1. [System Architecture](../02-architecture/system-architecture.md) - Understand
   the system design
2. [Technology Stack](technology-stack.md) - Learn about the technologies used
3. [Setup Guide](../08-development/setup-guide.md) - Set up your development
   environment

## Related Links

- [Flashpoint Archive](https://flashpointarchive.org/)
- [Flashpoint Launcher](https://github.com/FlashpointProject/launcher)
- [Ruffle Flash Emulator](https://ruffle.rs/)
