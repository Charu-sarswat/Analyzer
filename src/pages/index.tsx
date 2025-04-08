import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from 'axios';
import UserProfile from '@/components/UserProfile';
import RepositoryList from '@/components/RepositoryList';
import CommitChart from '@/components/CommitChart';
import TotalCommits from '@/components/TotalCommits';
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
    const [totalCommits, setTotalCommits] = useState(0);
    const [averageCommitsPerWeek, setAverageCommitsPerWeek] = useState(0);
    const [mostActiveDay, setMostActiveDay] = useState('');
    const [mostActiveDayCount, setMostActiveDayCount] = useState(0);
    const [githubToken, setGithubToken] = useState('');
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number, reset: number } | null>(null);

    // Check if we're rate limited on initial load
    useEffect(() => {
        checkRateLimit();
    }, []);

    const checkRateLimit = async () => {
        try {
            // Prepare headers with token if available
            const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
            if (githubToken) {
                headers['Authorization'] = `token ${githubToken}`;
            }

            const response = await axios.get('https://api.github.com/rate_limit', { headers });
            const remaining = response.data.rate.remaining;
            const reset = response.data.rate.reset;
            console.log(`GitHub API rate limit remaining: ${remaining}, resets at: ${new Date(reset * 1000).toLocaleTimeString()}`);

            setRateLimitInfo({ remaining, reset });

            if (remaining <= 10) {
                setIsRateLimited(true);
                setError(`GitHub API rate limit low (${remaining} requests remaining). Results may be limited.`);

                // Automatically switch to demo mode if rate limit is low
                if (!useDemoData) {
                    setUseDemoData(true);
                    setError('GitHub API rate limit reached. Automatically switched to demo mode.');
                }
            } else {
                setIsRateLimited(false);
            }

            return remaining;
        } catch (err) {
            console.error('Error checking rate limit:', err);
            setIsRateLimited(true);
            setError('Unable to check GitHub API rate limit. You may be rate limited.');

            // Automatically switch to demo mode if we can't check rate limit
            if (!useDemoData) {
                setUseDemoData(true);
                setError('GitHub API rate limit reached. Automatically switched to demo mode.');
            }

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

            const demoCommitActivity = generateDemoCommitData();
            setRepoCommits(demoRepoCommits);
            setCommitActivity(demoCommitActivity);
            processCommitData(demoCommitActivity);
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
            // Prepare headers with token if available
            const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
            if (githubToken) {
                headers['Authorization'] = `token ${githubToken}`;
            }

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
                let activityData: CommitActivity[] = [];
                let repoCommitInfo: RepoCommitInfo[] = [];

                for (const repo of reposForActivity) {
                    try {
                        console.log(`Fetching commit data for ${repo.name}...`);
                        const response = await axios.get(
                            `https://api.github.com/repos/${username}/${repo.name}/stats/commit_activity`,
                            { headers }
                        );

                        if (Array.isArray(response.data) && response.data.length > 0) {
                            // Add repo name to each week's data for tracking
                            const repoData = response.data.map((week: CommitActivity) => ({
                                ...week,
                                repoName: repo.name
                            }));

                            activityData = [...activityData, ...repoData];

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
                    processCommitData(activityData);
                } else {
                    console.log('No commit activity found, using demo data');

                    // Generate demo repo commit info for fallback
                    const demoRepoCommits = reposForActivity.map((repo: Repository) => {
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

            // Create more realistic commit pattern (weekdays have more commits)
            const days = Array(7).fill(0).map((_, dayIndex) => {
                // Weekdays (1-5) have more commits than weekends (0,6)
                const isWeekday = dayIndex > 0 && dayIndex < 6;
                const baseCommits = isWeekday ? 3 : 1;
                return Math.floor(Math.random() * baseCommits) + (isWeekday ? 1 : 0);
            });

            weeks.push({
                week: weekTimestamp,
                days: days,
                total: days.reduce((sum, count) => sum + count, 0)
            });
        }

        // Sort by week timestamp (newest first)
        return weeks.sort((a, b) => b.week - a.week);
    };

    const toggleDemoData = () => {
        setUseDemoData(!useDemoData);
    };

    const fetchCommitDataForRepository = async (repoName: string) => {
        if (!username || !repoName) return;

        setLoading(true);
        setError('');

        // Prepare headers with token if available
        const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }

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

                // If rate limit is low, switch to demo mode
                if (rateLimit && parseInt(rateLimit) <= 5) {
                    console.log('Rate limit low, switching to demo mode');
                    setUseDemoData(true);
                    setIsRateLimited(true);
                    setError('GitHub API rate limit reached. Automatically switched to demo mode.');
                    setCommitActivity(generateDemoCommitData());
                    setDataFetched(true);
                    setLoading(false);
                    return;
                }
            } catch (repoErr: any) {
                if (repoErr.response && repoErr.response.status === 404) {
                    console.error(`Repository ${repoName} not found or not accessible.`);
                    setError(`Repository "${repoName}" not found or not accessible. Make sure it's public and the name is correct.`);
                    setLoading(false);
                    return;
                } else if (repoErr.response && repoErr.response.status === 403) {
                    console.error('Rate limit exceeded when checking repository');
                    setError('GitHub API rate limit exceeded. Automatically switched to demo mode.');
                    setUseDemoData(true);
                    setIsRateLimited(true);
                    setCommitActivity(generateDemoCommitData());
                    setDataFetched(true);
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
                setError('GitHub API rate limit exceeded. Automatically switched to demo mode.');
                setUseDemoData(true);
                setIsRateLimited(true);
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
                        setError('GitHub API rate limit exceeded. Automatically switched to demo mode.');
                        setUseDemoData(true);
                        setIsRateLimited(true);
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
                processCommitData(response.data);
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
                    errorMessage = `GitHub API rate limit exceeded. Automatically switched to demo mode.`;
                    setIsRateLimited(true);
                    setUseDemoData(true);
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

    const processCommitData = (data: CommitActivity[]) => {
        if (!data || data.length === 0) {
            setTotalCommits(0);
            setAverageCommitsPerWeek(0);
            setMostActiveDay('No data');
            setMostActiveDayCount(0);
            return;
        }

        // Create a map to aggregate commits by week to avoid duplicates
        const weekMap = new Map<number, CommitActivity>();

        // Process each week's data
        data.forEach(week => {
            if (!week || !week.week || !Array.isArray(week.days)) {
                console.warn("Invalid week data:", week);
                return;
            }

            const weekTimestamp = week.week;

            if (weekMap.has(weekTimestamp)) {
                // Merge with existing week data
                const existingWeek = weekMap.get(weekTimestamp)!;
                const mergedDays = existingWeek.days.map((count, index) => count + week.days[index]);
                const mergedTotal = mergedDays.reduce((sum, count) => sum + count, 0);

                weekMap.set(weekTimestamp, {
                    week: weekTimestamp,
                    days: mergedDays,
                    total: mergedTotal
                });
            } else {
                // Add new week data
                weekMap.set(weekTimestamp, week);
            }
        });

        // Convert map back to array and sort by week timestamp (newest first)
        const processedData = Array.from(weekMap.values()).sort((a, b) => b.week - a.week);

        // Calculate total commits
        const total = processedData.reduce((sum, week) => sum + week.total, 0);
        setTotalCommits(total);

        // Calculate average commits per week
        const avg = processedData.length > 0 ? total / processedData.length : 0;
        setAverageCommitsPerWeek(avg);

        // Find most active day
        let maxDayCount = 0;
        let maxDayIndex = 0;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Create a map to aggregate commits by day of week
        const dayMap = new Map<number, number>();

        processedData.forEach(week => {
            week.days.forEach((count, index) => {
                const currentCount = dayMap.get(index) || 0;
                dayMap.set(index, currentCount + count);
            });
        });

        // Find the day with the most commits
        dayMap.forEach((count, index) => {
            if (count > maxDayCount) {
                maxDayCount = count;
                maxDayIndex = index;
            }
        });

        setMostActiveDay(daysOfWeek[maxDayIndex]);
        setMostActiveDayCount(maxDayCount);
    };

    // Add useEffect to process commit data when it changes
    useEffect(() => {
        if (commitActivity && commitActivity.length > 0) {
            processCommitData(commitActivity);
        }
    }, [commitActivity]);

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

                {/* GitHub Token Input */}
                <div className={styles.tokenSection}>
                    <button
                        onClick={() => setShowTokenInput(!showTokenInput)}
                        className={styles.tokenToggleButton}
                    >
                        {showTokenInput ? 'Hide GitHub Token Input' : 'Add GitHub Token (Increase Rate Limit)'}
                    </button>

                    {showTokenInput && (
                        <div className={styles.tokenInputContainer}>
                            <input
                                type="password"
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                placeholder="Enter your GitHub Personal Access Token"
                                className={styles.tokenInput}
                            />
                            <p className={styles.tokenInfo}>
                                Adding a GitHub token increases your rate limit from 60 to 5000 requests per hour.
                                <a
                                    href="https://github.com/settings/tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.tokenLink}
                                >
                                    Create a token here
                                </a>
                            </p>
                        </div>
                    )}
                </div>

                {isRateLimited && (
                    <div className={styles.rateLimitWarning}>
                        <p>⚠️ GitHub API rate limit reached (60 requests/hour limit). Using demo data instead.</p>
                        <p className={styles.rateLimitInfo}>
                            GitHub's API limits unauthenticated requests to 60 per hour. This limit will reset automatically after an hour.
                            {rateLimitInfo && (
                                <span> Your rate limit will reset at {new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}.</span>
                            )}
                            You can try again later, continue using demo data, or add a GitHub token to increase your rate limit.
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

                        <TotalCommits
                            totalCommits={totalCommits}
                            averageCommitsPerWeek={averageCommitsPerWeek}
                            mostActiveDay={mostActiveDay}
                            mostActiveDayCount={mostActiveDayCount}
                        />
                    </div>
                )}
            </main>
        </div>
    );
} 