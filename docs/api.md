# API Documentation

The backend exposes a REST API for the React frontend.

## Base URL
`/api/v1`

## Modules
- `/auth` - Authentication routes
- `/profile` - Profile management
- `/notes` - Notes and files management
- `/tasks` - Task management
- `/study` - Study sessions tracking
- `/progress` - DSA and exam progress
- `/goals` - Goal management
- `/analytics` - AI and statistics

## Error Handling
Standard error response:
```json
{
  "success": false,
  "error": {
    "message": "Error details"
  }
}
```
