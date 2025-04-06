# GitHub Activity Analyzer

A web application that analyzes a GitHub user's public activity, displaying their repositories and commit patterns.

## Features

- Search for any GitHub username
- View user profile information (avatar, name, bio, followers, etc.)
- Browse repositories with filtering and sorting options
- Visualize commit activity with interactive charts:
  - Weekly commit frequency
  - Commit distribution by day of week

## Technologies Used

- React
- Next.js
- TypeScript
- Axios for API requests
- Chart.js for data visualization

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/github-activity-analyzer.git
cd github-activity-analyzer
```

2. Install dependencies:
```
npm install
```

### Running the Application

Start the development server:
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. Enter a GitHub username in the search bar
2. Click "Analyze" to fetch and display the user's data
3. Browse through repositories and view commit activity charts

## Notes

- The GitHub API has rate limits for unauthenticated requests
- Commit activity is limited to the 5 most recent repositories to avoid exceeding API limits
- GitHub only provides commit data for up to 12 weeks

## License

ISC 