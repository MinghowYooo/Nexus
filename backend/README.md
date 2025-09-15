# Nexus Backend API

A Node.js backend API for the Nexus video recommendation app, handling 10,000+ YouTube videos with efficient pagination, search, and recommendation algorithms.

## Features

- **Efficient Data Loading**: Pagination and lazy loading for large datasets
- **Advanced Search**: Full-text search with relevance scoring
- **Recommendation Engine**: Content-based, collaborative, and hybrid filtering
- **User Interactions**: Track likes, views, shares, and dislikes
- **Performance Optimized**: Database indexes and query optimization

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up PostgreSQL database:**
```bash
# Create database
createdb nexus_videos

# Or using psql:
psql -U postgres
CREATE DATABASE nexus_videos;
```

3. **Configure environment:**
```bash
cp env.example .env
# Edit .env with your database credentials
```

4. **Set up database schema:**
```bash
npm run setup-db
```

5. **Import CSV data:**
```bash
npm run import-csv
```

6. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Videos
- `GET /api/videos` - Get paginated videos with filtering
- `GET /api/videos/trending` - Get trending videos
- `GET /api/videos/popular` - Get most popular videos
- `GET /api/videos/:id` - Get specific video
- `GET /api/videos/meta/categories` - Get available categories
- `GET /api/videos/meta/stats` - Get video statistics

### Search
- `GET /api/search?q=query` - Search videos
- `GET /api/search/suggestions?q=query` - Get search suggestions
- `GET /api/search/trending` - Get trending search terms

### Recommendations
- `GET /api/recommendations/content/:videoId` - Content-based recommendations
- `GET /api/recommendations/collaborative/:userId` - Collaborative filtering
- `GET /api/recommendations/hybrid/:userId` - Hybrid recommendations
- `POST /api/recommendations/interaction` - Record user interaction

## Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Filtering
- `category` - Filter by category
- `channel` - Filter by channel name
- `sort` - Sort by: view_count, like_count, comment_count, publish_date, daily_rank
- `order` - Sort order: asc, desc

### Search
- `q` - Search query
- `category` - Filter search results by category

## Example Usage

```javascript
// Get first page of videos
fetch('/api/videos?page=1&limit=20')

// Search for "gaming" videos
fetch('/api/search?q=gaming&limit=10')

// Get content-based recommendations
fetch('/api/recommendations/content/video123?limit=5')

// Record user interaction
fetch('/api/recommendations/interaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    videoId: 'video456',
    interactionType: 'like',
    score: 1
  })
})
```

## Database Schema

### Videos Table
- `id` - Video ID (primary key)
- `title` - Video title
- `channel_name` - Channel name
- `description` - Video description
- `view_count` - Number of views
- `like_count` - Number of likes
- `video_tags` - Array of tags
- `category` - Video category
- `publish_date` - Publication date

### Users Table
- `id` - User ID (UUID)
- `session_id` - Session identifier
- `preferences` - User preferences (JSONB)

### User Interactions Table
- `user_id` - User ID (foreign key)
- `video_id` - Video ID (foreign key)
- `interaction_type` - Type of interaction
- `score` - Interaction score

## Performance Features

- **Database Indexes**: Optimized for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed searches and joins
- **Pagination**: Prevents memory issues with large datasets
- **Caching Ready**: Structure supports Redis caching

## Development

```bash
# Watch for changes
npm run dev

# Run database setup
npm run setup-db

# Import CSV data
npm run import-csv
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx)
4. Enable SSL/HTTPS
5. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **CSV Import Fails**
   - Check CSV file path
   - Verify CSV format matches expected schema
   - Check database permissions

3. **Slow Queries**
   - Ensure database indexes are created
   - Check query execution plans
   - Consider adding more specific indexes

## License

MIT
