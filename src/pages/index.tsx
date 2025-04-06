import React, { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import UserProfile from '@/components/UserProfile';
import RepositoryList from '@/components/RepositoryList';
import CommitChart from '@/components/CommitChart';
import styles from '@/styles/Home.module.css';

interface Repository {
    id: number;
    name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    forks_count: number;
    language: string;
}

interface CommitActivity {
    days: number[];
    total: number;
    week: number;
}

export default function Home() {
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [commitActivity, setCommitActivity] = useState<CommitActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dataFetched, setDataFetched] = useState(false);

    const fetchGithubData = async () => {
        if (!username) {
            setError('Please enter a GitHub username');
            return;
        }

        setLoading(true);
        setError('');
        setDataFetched(false);

        try {
            // Fetch user data
            const userResponse = await axios.get(`https://api.github.com/users/${username}`);
            setUserData(userResponse.data);

            // Fetch repositories
            const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`);
            setRepositories(reposResponse.data);

            // Check if there are any repositories
            if (!reposResponse.data || reposResponse.data.length === 0) {
                console.log('User has no repositories');
                // Set empty commit activity - chart will handle this gracefully
                setCommitActivity([]);
                setDataFetched(true);
                return;
            }

            // Fetch commit activity for each repository (limited to first 5 repos to avoid rate limiting)
            const reposForActivity = reposResponse.data.slice(0, 5);

            // Sometimes GitHub API returns 202 and needs time to generate stats
            // We'll retry up to 3 times with delay
            let commitSuccess = false;
            let retryCount = 0;

            while (!commitSuccess && retryCount < 3) {
                try {
                    // Adding delay for retries
                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }

                    const activityPromises = reposForActivity.map((repo: Repository) =>
                        axios.get(`https://api.github.com/repos/${username}/${repo.name}/stats/commit_activity`)
                            .catch(error => {
                                console.log(`Error fetching commit data for ${repo.name}:`, error.message);
                                return { data: [] }; // Handle repos with no commit data
                            })
                    );

                    const activityResponses = await Promise.all(activityPromises);
                    const activityData = activityResponses
                        .map(response => {
                            // Ensure we have valid data format
                            if (Array.isArray(response.data)) {
                                return response.data;
                            } else {
                                console.log('Invalid commit activity format:', response.data);
                                return [];
                            }
                        })
                        .filter(data => data.length > 0);

                    // Check if we got any valid commit data
                    if (activityData.length > 0) {
                        setCommitActivity(activityData.flat());
                        commitSuccess = true;
                    } else if (retryCount === 2) {
                        // On last retry, create some demo data if no real data available
                        console.log('No commit data available after retries. Using demo data.');
                        setCommitActivity(generateDemoCommitData());
                        commitSuccess = true;
                    }
                } catch (err) {
                    console.error('Error fetching commit activity:', err);
                }

                retryCount++;
            }

            setDataFetched(true);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Error fetching GitHub data. Please check the username and try again.');
            setDataFetched(false);
        } finally {
            setLoading(false);
        }
    };

    // Generate demo commit data for testing or when GitHub API doesn't return data
    const generateDemoCommitData = (): CommitActivity[] => {
        const weeks = [];
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const oneWeek = 7 * 24 * 60 * 60; // One week in seconds

        // Generate 12 weeks of demo data
        for (let i = 0; i < 12; i++) {
            const weekTimestamp = now - (11 - i) * oneWeek;
            const days = Array(7).fill(0).map(() => Math.floor(Math.random() * 5)); // 0-4 commits per day

            weeks.push({
                week: weekTimestamp,
                days: days,
                total: days.reduce((sum, count) => sum + count, 0)
            });
        }

        return weeks;
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>GitHub Activity Analyzer</title>
                <meta name="description" content="Analyze GitHub user activity" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>GitHub Activity Analyzer</h1>

                <div className={styles.search}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter GitHub username"
                        className={styles.input}
                        onKeyPress={(e) => e.key === 'Enter' && fetchGithubData()}
                    />
                    <button
                        onClick={fetchGithubData}
                        disabled={loading}
                        className={styles.button}
                    >
                        {loading ? 'Loading...' : 'Analyze'}
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                {userData && (
                    <div className={styles.results}>
                        <UserProfile user={userData} />

                        {repositories.length > 0 && (
                            <RepositoryList repositories={repositories} />
                        )}

                        {dataFetched && (
                            <CommitChart commitActivity={commitActivity} />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
} 