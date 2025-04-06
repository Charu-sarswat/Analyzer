import React, { useState, useEffect } from 'react';
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

interface RepoCommitInfo {
    name: string;
    commits: number;
}

export default function Home() {
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [commitActivity, setCommitActivity] = useState<CommitActivity[]>([]);
    const [repoCommits, setRepoCommits] = useState<RepoCommitInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dataFetched, setDataFetched] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [useDemoData, setUseDemoData] = useState(false);

    // Check if we're rate limited on initial load
    useEffect(() => {
        checkRateLimit();
    }, []);

    const checkRateLimit = async () => {
        try {
            // Only use safe headers in browser environment
            const response = await axios.get('https://api.github.com/rate_limit', {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            const remaining = response.data.rate.remaining;
            console.log(`GitHub API rate limit remaining: ${remaining}`);

            if (remaining <= 10) {
                setIsRateLimited(true);
                setError(`GitHub API rate limit low (${remaining} requests remaining). Results may be limited.`);
            } else {
                setIsRateLimited(false);
            }

            return remaining;
        } catch (err) {
            console.error('Error checking rate limit:', err);
            setIsRateLimited(true);
            setError('Unable to check GitHub API rate limit. You may be rate limited.');
            return 0;
        }
    };

    const fetchGithubData = async () => {
        if (!username) {
            setError('Please enter a GitHub username');
            return;
        }

        setLoading(true);
        setError('');
        setDataFetched(false);

        // If user wants to use demo data, skip API calls
        if (useDemoData) {
            // Generate demo repos
            const demoRepos = Array(5).fill(0).map((_, i) => ({
                id: i,
                name: `repo-${i + 1}`,
                html_url: `https://github.com/${username}/repo-${i + 1}`,
                description: `Demo repository ${i + 1}`,
                stargazers_count: Math.floor(Math.random() * 100),
                forks_count: Math.floor(Math.random() * 50),
                language: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'][Math.floor(Math.random() * 5)]
            }));

            setRepositories(demoRepos);

            // Generate demo repo commit info
            const demoRepoCommits = demoRepos.map(repo => {
                const commits = Math.floor(Math.random() * 200) + 50;
                return {
                    name: repo.name,
                    commits
                };
            });

            setRepoCommits(demoRepoCommits);
            setCommitActivity(generateDemoCommitData());
            setDataFetched(true);
            setLoading(false);
            return;
        }

        // Check if we're rate limited before making API calls
        const rateLimit = await checkRateLimit();
        if (rateLimit < 5) {
            setError('GitHub API rate limit reached. Try again later or use demo data.');
            setLoading(false);
            return;
        }

        try {
            // Use only safe headers for browser environment
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };

            // Fetch user data
            console.log(`Fetching data for user: ${username}`);
            try {
                const userResponse = await axios.get(`https://api.github.com/users/${username}`, { headers });
                setUserData(userResponse.data);
            } catch (userErr: any) {
                if (userErr.response && userErr.response.status === 403) {
                    setIsRateLimited(true);
                    setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                    setLoading(false);
                    return;
                } else if (userErr.response && userErr.response.status === 404) {
                    setError(`User "${username}" not found on GitHub.`);
                    setLoading(false);
                    return;
                } else {
                    throw userErr;
                }
            }

            // Fetch repositories
            try {
                const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
                const repos = reposResponse.data;
                setRepositories(repos);

                // Check if there are any repositories
                if (!repos || repos.length === 0) {
                    console.log('User has no repositories');
                    setCommitActivity([]);
                    setDataFetched(true);
                    setLoading(false);
                    return;
                }

                // Fetch commit activity (limit to 5 repos to avoid rate limiting)
                const reposForActivity = repos.slice(0, 5);
                let activityData: any[] = [];
                let repoCommitInfo: RepoCommitInfo[] = [];

                for (const repo of reposForActivity) {
                    try {
                        console.log(`Fetching commit data for ${repo.name}...`);
                        const response = await axios.get(
                            `https://api.github.com/repos/${username}/${repo.name}/stats/commit_activity`,
                            { headers }
                        );

                        if (Array.isArray(response.data) && response.data.length > 0) {
                            activityData = [...activityData, ...response.data];

                            // Calculate total commits for this repo
                            const repoTotalCommits = response.data.reduce(
                                (sum: number, week: CommitActivity) => sum + (week.total || 0),
                                0
                            );

                            repoCommitInfo.push({
                                name: repo.name,
                                commits: repoTotalCommits
                            });
                        }

                        // Small delay between requests
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (repoErr: any) {
                        if (repoErr.response && repoErr.response.status === 403) {
                            console.warn(`Rate limited while fetching commit data for ${repo.name}`);
                            break; // Stop trying more repos if rate limited
                        }
                        console.warn(`Error fetching commit data for ${repo.name}:`, repoErr.message);
                    }
                }

                if (activityData.length > 0) {
                    setCommitActivity(activityData);
                    setRepoCommits(repoCommitInfo);
                } else {
                    console.log('No commit activity found, using demo data');

                    // Generate demo repo commit info for fallback
                    const demoRepoCommits = reposForActivity.map(repo => {
                        const commits = Math.floor(Math.random() * 200) + 50;
                        return {
                            name: repo.name,
                            commits
                        };
                    });

                    setRepoCommits(demoRepoCommits);
                    setCommitActivity(generateDemoCommitData());
                }
            } catch (reposErr: any) {
                if (reposErr.response && reposErr.response.status === 403) {
                    setIsRateLimited(true);
                    setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                    setCommitActivity(generateDemoCommitData());
                } else {
                    throw reposErr;
                }
            }

            setDataFetched(true);
        } catch (err: any) {
            console.error('Error fetching data:', err);

            if (err.response && err.response.status === 403) {
                setIsRateLimited(true);
                setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                // Still show demo data even when rate limited
                setCommitActivity(generateDemoCommitData());
                setDataFetched(true);
            } else if (err.response && err.response.status === 404) {
                setError(`User "${username}" not found on GitHub.`);
                setDataFetched(false);
            } else {
                setError('Error fetching GitHub data. Please check the username and try again.');
                setDataFetched(false);
            }
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

    const toggleDemoData = () => {
        setUseDemoData(!useDemoData);
    };

    const fetchCommitDataForRepository = async (repoName: string) => {
        if (!username || !repoName) return;

        setLoading(true);
        setError('');

        // Use only safe headers in browser environment
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            console.log(`Fetching commit activity for ${repoName}...`);

            // First, verify that the repository exists and is accessible
            try {
                const repoCheckResponse = await axios.get(
                    `https://api.github.com/repos/${username}/${repoName}`,
                    { headers }
                );
                console.log(`Repository ${repoName} exists and is accessible.`);

                // Check rate limit info in headers
                const rateLimit = repoCheckResponse.headers['x-ratelimit-remaining'];
                console.log(`GitHub API rate limit remaining: ${rateLimit || 'unknown'}`);
            } catch (repoErr: any) {
                if (repoErr.response && repoErr.response.status === 404) {
                    console.error(`Repository ${repoName} not found or not accessible.`);
                    setError(`Repository "${repoName}" not found or not accessible. Make sure it's public and the name is correct.`);
                    setLoading(false);
                    return;
                } else if (repoErr.response && repoErr.response.status === 403) {
                    console.error('Rate limit exceeded when checking repository');
                    setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                    setLoading(false);
                    return;
                }
            }

            const response = await axios.get(
                `https://api.github.com/repos/${username}/${repoName}/stats/commit_activity`,
                {
                    headers,
                    validateStatus: status => status === 200 || status === 202 || status === 404 || status === 403
                }
            );

            // Handle rate limiting explicitly
            if (response.status === 403) {
                console.error('Rate limit exceeded when fetching commit activity');
                setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                setCommitActivity(generateDemoCommitData());
                setDataFetched(true);
                setLoading(false);
                return;
            }

            // If GitHub is still calculating stats (202 response)
            if (response.status === 202) {
                console.log(`GitHub is calculating stats for ${repoName}, retry after delay...`);
                // Wait 2 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 2000));

                try {
                    const retryResponse = await axios.get(
                        `https://api.github.com/repos/${username}/${repoName}/stats/commit_activity`,
                        { headers }
                    );

                    if (Array.isArray(retryResponse.data) && retryResponse.data.length > 0) {
                        console.log(`Got commit data for ${repoName} on retry`);
                        setCommitActivity(retryResponse.data);
                    } else {
                        console.log('No commit data available on retry. Using demo data.');
                        setCommitActivity(generateDemoCommitData());
                        setError(`No commit activity found for "${repoName}". This may happen with new or empty repositories.`);
                    }
                } catch (retryErr: any) {
                    if (retryErr.response && retryErr.response.status === 403) {
                        console.error('Rate limit exceeded during retry');
                        setError('GitHub API rate limit exceeded. Please try again later or use demo data.');
                    } else {
                        console.warn(`Failed to get commit data for ${repoName} on retry`);
                        setError(`Unable to fetch commit data for "${repoName}". GitHub API may be rate limited.`);
                    }
                    console.log('Using demo data instead.');
                    setCommitActivity(generateDemoCommitData());
                }
            }
            // If we got data immediately (200 response)
            else if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
                console.log(`Got commit data for ${repoName}`);

                // Calculate total commits for this repo
                const repoTotalCommits = response.data.reduce(
                    (sum, week) => sum + (week.total || 0),
                    0
                );

                setRepoCommits([{
                    name: repoName,
                    commits: repoTotalCommits
                }]);

                setCommitActivity(response.data);
            }
            // If repository not found or no access (404 response)
            else if (response.status === 404) {
                console.error(`Repository stats endpoint not available for ${repoName}`);
                setCommitActivity(generateDemoCommitData());
                setError(`Repository stats not available for "${repoName}". This may happen with new repositories.`);
            }
            else {
                console.log('No commit activity data found, using demo data');
                setCommitActivity(generateDemoCommitData());
                setError(`No commit activity found for "${repoName}". This could be a new repository or one without commits.`);
            }

            setDataFetched(true);
        } catch (err: any) {
            console.error('Error fetching commit activity:', err);
            let errorMessage = `Error fetching commit data for repository: ${repoName}`;

            // Try to get more detailed error information
            if (err.response) {
                console.error(`Status: ${err.response.status}`);
                console.error('Response data:', err.response.data);

                if (err.response.status === 403) {
                    errorMessage = `GitHub API rate limit exceeded. Please try again later or use demo data.`;
                    setIsRateLimited(true);
                } else if (err.response.status === 404) {
                    errorMessage = `Repository "${repoName}" not found or not accessible.`;
                }
            }

            setError(errorMessage);
            // Use demo data as fallback
            setCommitActivity(generateDemoCommitData());

            // Generate demo repo commit info for fallback
            setRepoCommits([{
                name: repoName,
                commits: Math.floor(Math.random() * 200) + 50
            }]);

            setDataFetched(true); // Show the chart with demo data even if there's an error
        } finally {
            setLoading(false);
        }
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

                {/* Always show toggle for demo mode */}
                <div className={styles.demoModeToggle}>
                    <button
                        onClick={toggleDemoData}
                        className={useDemoData ? styles.demoButtonActive : styles.demoButton}
                    >
                        {useDemoData ? '✓ Using Demo Mode' : 'Switch to Demo Mode'}
                    </button>
                    <p className={styles.demoToggleInfo}>
                        {useDemoData
                            ? 'Using sample data instead of GitHub API.'
                            : 'Switch to demo data if you encounter rate limits.'}
                    </p>
                </div>

                {isRateLimited && (
                    <div className={styles.rateLimitWarning}>
                        <p>⚠️ GitHub API rate limit reached (60 requests/hour limit). Some features may be limited.</p>
                        <p className={styles.rateLimitInfo}>
                            GitHub's API limits unauthenticated requests to 60 per hour. This limit will reset automatically after an hour.
                        </p>
                    </div>
                )}

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
                        {loading ? 'Loading...' : useDemoData ? 'Show Demo' : 'Analyze'}
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
                            <div className={styles.commitSection}>
                                {useDemoData && (
                                    <div className={styles.demoNotice}>
                                        Showing demo data visualization (not actual GitHub data)
                                    </div>
                                )}
                                <CommitChart
                                    commitActivity={commitActivity}
                                    repoCommits={repoCommits}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
} 