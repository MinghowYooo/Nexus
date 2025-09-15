# Nexus - AI-Powered Video Discovery Platform

Nexus is a modern, AI-powered video discovery platform that combines YouTube's vast video library with intelligent AI assistance for enhanced content discovery and creator tools.

## 🚀 Features

### Core Features
- **AI-Powered Search**: Natural language video search with intelligent recommendations
- **YouTube Integration**: Real-time search through YouTube's video library
- **Smart Comments Analysis**: AI-powered comment sentiment analysis and insights
- **Creator Tools**: Comment summarization, reply generation, and content optimization
- **Personal Playlists**: Organize and discover videos with smart recommendations
- **Modern UI**: Beautiful, responsive interface with dark theme

### AI Capabilities
- **Gemini Integration**: Powered by Google's Gemini AI for intelligent responses
- **Context-Aware Search**: Understands user intent and provides relevant results
- **Comment Analysis**: Sentiment analysis, theme extraction, and actionable insights
- **Content Optimization**: Proofreading and rewriting assistance for creators

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **AI**: Google Gemini API
- **Video Platform**: YouTube Data API v3
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom animations

## 📁 Project Structure

```
nexus-app/
├── src/
│   ├── components/          # React components
│   │   ├── AssistantPanel.jsx
│   │   ├── VideoCard.jsx
│   │   ├── VideoGridPanel.jsx
│   │   ├── ShareMenu.jsx
│   │   └── RedNAvatar.jsx
│   ├── config/             # Configuration files
│   │   └── api.js
│   ├── services/           # API services
│   │   ├── youtubeApi.js
│   │   └── geminiApi.js
│   ├── hooks/              # Custom React hooks
│   │   └── useVideoSearch.js
│   ├── utils/              # Utility functions
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── App.jsx             # Main application component
│   └── main.jsx            # Application entry point
├── public/                 # Static assets
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- YouTube Data API v3 key
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexus-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔑 API Setup

### YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Add the API key to your `.env` file

**Required APIs:**
- YouTube Data API v3

### Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the API key to your `.env` file

**Required APIs:**
- Generative Language API

## 🎯 Usage

### Search Videos
- Type natural language queries in the search bar
- AI will interpret your intent and find relevant videos
- Results are displayed in a responsive grid layout

### Comment Analysis
- Click on any video's comment button
- Use AI to analyze comment sentiment and themes
- Get actionable insights for content creators

### Smart Recommendations
- Create playlists of your favorite videos
- Use "Smart Recommend" to get AI-powered suggestions
- Discover new content based on your preferences

## 🎨 Customization

### Styling
The app uses Tailwind CSS with custom animations. Key style files:
- Global styles in `App.jsx`
- Component-specific styles using Tailwind classes

### API Configuration
Modify API settings in `src/config/api.js`:
- Change API endpoints
- Adjust request parameters
- Modify response handling

### Mock Data
When APIs are not configured, the app falls back to mock data defined in `src/utils/constants.js`.

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Structure
- **Components**: Reusable UI components
- **Services**: API integration layer
- **Hooks**: Custom React hooks for state management
- **Utils**: Helper functions and constants

## 🐛 Troubleshooting

### Common Issues

**API Keys Not Working**
- Verify API keys are correctly set in `.env`
- Check API quotas and billing
- Ensure APIs are enabled in Google Cloud Console

**No Videos Found**
- Check YouTube API quota limits
- Verify search query format
- App will fall back to mock data if APIs fail

**Styling Issues**
- Ensure Tailwind CSS is properly configured
- Check for CSS conflicts
- Verify responsive breakpoints

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review API documentation

## 🔮 Future Features

- Voice search integration
- Advanced creator analytics
- Social sharing enhancements
- Mobile app development
- Real-time collaboration tools

---

**Built with ❤️ using React, AI, and modern web technologies.**