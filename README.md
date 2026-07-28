# Next.js

A modern Next.js 15 application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Next.js 15** - Latest version with improved performance and features
- **React 19** - Latest React version with enhanced capabilities
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Real-time Messaging** - Production-ready messaging system with Supabase
  - Real-time message delivery via Supabase Realtime
  - Typing indicators and read receipts
  - File sharing (images, videos, documents)
  - Conversation management
  - Online presence tracking
  - Message reactions and replies
  - Pin and archive conversations

## 🛠️ Installation

1. Install dependencies:
  ```bash
  npm install
  # or
  yarn install
  ```

2. Start the development server:
  ```bash
  npm run dev
  # or
  yarn dev
  ```
3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

## 📁 Project Structure

```
nextjs/
├── public/             # Static assets
├── src/
│   ├── app/            # App router components
│   │   ├── layout.tsx  # Root layout component
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable UI components
│   ├── styles/         # Global styles and Tailwind configuration
├── next.config.mjs     # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
└── tailwind.config.js  # Tailwind CSS configuration

```

## 🧩 Page Editing

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 🎨 Styling

This project uses Tailwind CSS for styling with the following features:
- Utility-first approach for rapid development
- Custom theme configuration
- Responsive design utilities
- PostCSS and Autoprefixer integration

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## 📱 Deployment

Build the application for production:

  ```bash
  npm run build
  ```

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js and React
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new

## 💬 Messaging System

The application includes a production-ready real-time messaging system built with Supabase.

### Setup Instructions

1. **Run Database Migration**
   - Navigate to your Supabase dashboard
   - Go to SQL Editor
   - Run the migration script from `supabase/migrations/001_create_messaging_tables.sql`
   - This will create all necessary tables, indexes, and RLS policies

2. **Create Storage Bucket**
   - In Supabase dashboard, go to Storage
   - Create a new bucket named `chat-files`
   - Make it public for file sharing functionality

3. **Access the Messaging Interface**
   - Navigate to `/messaging` in your application
   - The messaging system is ready to use with your existing authentication

### API Endpoints

- `GET/POST /api/messaging/conversations` - List/create conversations
- `GET/PATCH/POST /api/messaging/conversations/[id]` - Manage specific conversations
- `POST/DELETE /api/messaging/conversations/[id]/members` - Manage conversation members
- `POST /api/messaging/messages` - Send a message
- `GET /api/messaging/messages/[conversationId]` - Get conversation messages
- `PATCH/DELETE /api/messaging/messages/[id]` - Update/delete messages
- `POST /api/messaging/typing` - Set typing status
- `POST /api/messaging/files` - Upload files

### Components

- `ChatList` - Displays all user conversations
- `ChatWindow` - Main chat interface with messages
- `MessageBubble` - Individual message display
- `MessageInput` - Message composition with file upload
- `ConversationItem` - Single conversation in the list
- `TypingIndicator` - Shows typing status

### Context

- `ChatContext` - Provides messaging state and functions to components
- `useChat` hook - Access chat context in components