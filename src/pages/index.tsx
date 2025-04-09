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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [dataFetched, setDataFetched] = useState(false);
    const [commitActivity, setCommitActivity] = useState<CommitActivity[]>([]);
    const [repoCommits, setRepoCommits] = useState<RepoCommitInfo[]>([]);
    const [totalCommits, setTotalCommits] = useState(0);
    const [averageCommitsPerWeek, setAverageCommitsPerWeek] = useState(0);
    const [mostActiveDay, setMostActiveDay] = useState('');
    const [mostActiveDayCount, setMostActiveDayCount] = useState(0);

    const fetchGithubData = async () => {
        if (!username) {
            setError('Please enter a GitHub username');
            return;
        }

        setLoading(true);
        setError('');
        setDataFetched(false);

        try {
            const userResponse = await axios.get(`https://api.github.com/users/${username}`);
            setUserData(userResponse.data);
            
            // Fetch repositories
            const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`);
            setRepositories(reposResponse.data);

            // Fetch commit activity for top 5 repositories
            const reposForActivity = reposResponse.data.slice(0, 5);
            let activityData: CommitActivity[] = [];

            // Process each repository
            for (const repo of reposForActivity) {
                try {
                    const response = await axios.get(
                        `https://api.github.com/repos/${username}/${repo.name}/stats/commit_activity`
                    );

                    if (Array.isArray(response.data) && response.data.length > 0) {
                        const repoData = response.data.map((week: CommitActivity) => ({
                            ...week,
                            repoName: repo.name
                        }));

                        activityData = [...activityData, ...repoData];

                        const repoTotalCommits = response.data.reduce(
                            (sum: number, week: CommitActivity) => sum + (week.total || 0),
                            0
                        );

                        setRepoCommits(prev => [...prev, {
                            name: repo.name,
                            commits: repoTotalCommits
                        }]);
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (repoErr: any) {
                    console.warn(`Error fetching commit data for ${repo.name}:`, repoErr.message);
                }
            }

            if (activityData.length > 0) {
                setCommitActivity(activityData);
                processCommitData(activityData);
            } else {
                console.log('No commit activity found');
            }

            setDataFetched(true);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('Error fetching GitHub data. Please check the username and try again.');
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

        const weekMap = new Map<number, CommitActivity>();

        data.forEach(week => {
            if (!week || !week.week || !Array.isArray(week.days)) {
                console.warn("Invalid week data:", week);
                return;
            }

            const weekTimestamp = week.week;

            if (weekMap.has(weekTimestamp)) {
                const existingWeek = weekMap.get(weekTimestamp)!;
                const mergedDays = existingWeek.days.map((count, index) => count + week.days[index]);
                const mergedTotal = mergedDays.reduce((sum, count) => sum + count, 0);

                weekMap.set(weekTimestamp, {
                    week: weekTimestamp,
                    days: mergedDays,
                    total: mergedTotal
                });
            } else {
                weekMap.set(weekTimestamp, week);
            }
        });

        const processedData = Array.from(weekMap.values()).sort((a, b) => b.week - a.week);

        const total = processedData.reduce((sum, week) => sum + week.total, 0);
        setTotalCommits(total);

        const avg = processedData.length > 0 ? total / processedData.length : 0;
        setAverageCommitsPerWeek(avg);

        let maxDayCount = 0;
        let maxDayIndex = 0;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const dayMap = new Map<number, number>();

        processedData.forEach(week => {
            week.days.forEach((count, index) => {
                const currentCount = dayMap.get(index) || 0;
                dayMap.set(index, currentCount + count);
            });
        });

        dayMap.forEach((count, index) => {
            if (count > maxDayCount) {
                maxDayCount = count;
                maxDayIndex = index;
            }
        });

        setMostActiveDay(daysOfWeek[maxDayIndex]);
        setMostActiveDayCount(maxDayCount);
    };

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
                            <div className={styles.commitSection}>
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