import React, { useEffect, useState, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler,
    ArcElement,
    TimeScale,
    ChartData,
    ChartOptions
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import styles from '@/styles/CommitChart.module.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Filler,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

interface CommitActivity {
    week: number;
    total: number;
    days: number[];
}

interface RepoCommit {
    name: string;
    commits: number;
}

interface RepoStat {
    name: string;
    commits: number;
    color: string;
    percentage: number;
}

interface RepoCommitInfo {
    data: {
        labels: string[];
        datasets: {
            data: number[];
            backgroundColor: string[];
            borderColor: string[];
            borderWidth: number;
        }[];
    };
    options: {
        responsive: boolean;
        plugins: {
            legend: {
                position: 'right';
            };
            title: {
                display: boolean;
                text: string;
            };
            tooltip: {
                callbacks: {
                    label: (context: any) => string;
                };
            };
        };
    };
    repoStats: RepoStat[];
}

interface CommitChartProps {
    commitActivity: CommitActivity[];
    repoCommits: RepoCommit[];
}

interface BarChartState {
    data: ChartData<'bar'>;
    options: ChartOptions<'bar'>;
}

interface LineChartState {
    data: ChartData<'line'>;
    options: ChartOptions<'line'>;
}

interface PieChartState {
    data: ChartData<'pie'>;
    options: ChartOptions<'pie'>;
}

interface ProcessedCommitData {
    weeklyChart: {
        data: ChartData<'bar'>;
        options: ChartOptions<'bar'>;
    };
    calendarData: Array<{
        date: string;
        count: number;
    }>;
    maxCommits: number;
    commitStats: {
        totalCommits: number;
        averageCommitsPerWeek: number;
        mostActiveDay: string;
        mostActiveDayCount: number;
    };
}

// Colors for heat map intensity
const getHeatMapColor = (intensity: number): string => {
    if (intensity === 0) return '#ebedf0';
    if (intensity <= 2) return '#9be9a8';
    if (intensity <= 5) return '#40c463';
    if (intensity <= 10) return '#30a14e';
    return '#216e39';
};

// Colors for the pie chart
const pieChartColors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)',
    'rgba(83, 102, 255, 0.7)',
    'rgba(40, 159, 64, 0.7)',
    'rgba(210, 199, 199, 0.7)',
];

// Move helper functions outside component
const processCommitData = (commitActivity: CommitActivity[]): ProcessedCommitData | null => {
    if (!commitActivity || !Array.isArray(commitActivity) || commitActivity.length === 0) {
        return null;
    }

    try {
        const lastWeeks = commitActivity.slice(-12);
        if (!lastWeeks.length) return null;

        // Initialize arrays for tracking
        const allDailyCommits: Array<{ date: string; count: number }> = [];
        const dailyData = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        let totalCommits = 0;

        // Process each week's data
        lastWeeks.forEach(week => {
            if (!week || !week.week || !Array.isArray(week.days)) return;

            const weekStart = new Date(week.week * 1000);

            // Process each day in the week
            week.days.forEach((commits, dayIndex) => {
                const currentDay = new Date(weekStart);
                currentDay.setDate(weekStart.getDate() + dayIndex);

                const formattedDate = `${currentDay.getMonth() + 1}/${currentDay.getDate()}`;
                const commitCount = commits || 0;

                allDailyCommits.push({
                    date: formattedDate,
                    count: commitCount
                });

                // Update daily totals
                dailyData[dayIndex] += commitCount;
                totalCommits += commitCount;
            });
        });

        // Sort commits by date
        allDailyCommits.sort((a, b) => {
            const dateA = new Date(`2023/${a.date}`);
            const dateB = new Date(`2023/${b.date}`);
            return dateA.getTime() - dateB.getTime();
        });

        // Get week labels
        const weekLabels = lastWeeks.map(week => {
            const date = new Date(week.week * 1000); // Convert Unix timestamp to date
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        // Calculate commit statistics
        const averagePerWeek = totalCommits / lastWeeks.length;

        // Find most active day
        const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const mostActiveDayIndex = dailyData.indexOf(Math.max(...dailyData));
        const mostActiveDay = dayLabels[mostActiveDayIndex];
        const mostActiveDayCount = dailyData[mostActiveDayIndex];

        // Get weekly commit counts
        const weeklyData = lastWeeks.map(week => week.total || 0);

        // Prepare weekly chart data
        const weeklyChartData = {
            labels: weekLabels,
            datasets: [
                {
                    label: 'Weekly Commits',
                    data: weeklyData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }
            ]
        };

        // Chart options for weekly data
        const weeklyChartOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top' as const,
                },
                title: {
                    display: true,
                    text: 'Commit Activity (Last 12 Weeks)',
                },
            },
        };

        return {
            weeklyChart: {
                data: weeklyChartData,
                options: weeklyChartOptions
            },
            calendarData: allDailyCommits,
            maxCommits: Math.max(...allDailyCommits.map(day => day.count), 1),
            commitStats: {
                totalCommits,
                averageCommitsPerWeek: Math.round(averagePerWeek * 10) / 10,
                mostActiveDay,
                mostActiveDayCount
            }
        };
    } catch (error) {
        console.error("Error processing commit data:", error);
        return null;
    }
};

const processRepoCommits = (repos: RepoCommit[]) => {
    if (!repos || repos.length === 0) return null;

    // Calculate total commits across all repos
    const totalCommits = repos.reduce((sum, repo) => sum + repo.commits, 0);

    // Prepare data for pie chart
    const repoLabels = repos.map(repo => repo.name);
    const repoData = repos.map(repo => repo.commits);
    const repoPercentages = repos.map(repo =>
        Math.round((repo.commits / totalCommits) * 100)
    );

    // Chart data
    const pieData = {
        labels: repoLabels,
        datasets: [
            {
                data: repoData,
                backgroundColor: pieChartColors.slice(0, repos.length),
                borderColor: pieChartColors.slice(0, repos.length).map(color => color.replace('0.7', '1')),
                borderWidth: 1,
            }
        ]
    };

    // Chart options
    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
            },
            title: {
                display: true,
                text: 'Commits by Repository',
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const percentage = repoPercentages[context.dataIndex];
                        return `${label}: ${value} commits (${percentage}%)`;
                    }
                }
            }
        },
    };

    return {
        data: pieData,
        options: pieOptions,
        repoStats: repos.map((repo, index) => ({
            name: repo.name,
            commits: repo.commits,
            percentage: repoPercentages[index],
            color: pieChartColors[index % pieChartColors.length]
        }))
    };
};

// Initial state
const initialChartState: BarChartState = {
    data: { labels: [], datasets: [] },
    options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: '' } } }
};

const CommitChart: React.FC<CommitChartProps> = ({ commitActivity, repoCommits }) => {
    const [weeklyChart, setWeeklyChart] = useState<BarChartState | null>(null);
    const [calendarChart, setCalendarChart] = useState<LineChartState | null>(null);
    const [repoChart, setRepoChart] = useState<PieChartState | null>(null);
    const [maxCommits, setMaxCommits] = useState(1);
    const [commitStats, setCommitStats] = useState({
        totalCommits: 0,
        averageCommitsPerWeek: 0,
        mostActiveDay: '',
        mostActiveDayCount: 0
    });
    const [processedRepoCommits, setProcessedRepoCommits] = useState<RepoCommitInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [hoveredStat, setHoveredStat] = useState<string | null>(null);

    // Enhanced chart options with modern styling
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 2000,
            easing: 'easeInOutQuart' as const,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12,
                    },
                    padding: 20,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#333',
                bodyColor: '#666',
                borderColor: '#e0e0e0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function (context: any) {
                        return `${context.dataset.label}: ${context.raw} commits`;
                    }
                }
            },
        },
    };

    // Process commit activity data with enhanced visualization
    const processedData = useMemo(() => {
        if (!commitActivity) return null;
        const data = processCommitData(commitActivity);
        if (data) {
            // Enhance weekly chart data
            const weeklyData = {
                ...data.weeklyChart,
                options: {
                    ...chartOptions,
                    ...data.weeklyChart.options,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                                font: {
                                    family: "'Inter', sans-serif",
                                },
                            },
                        },
                        x: {
                            grid: {
                                display: false,
                            },
                            ticks: {
                                font: {
                                    family: "'Inter', sans-serif",
                                },
                            },
                        },
                    },
                },
            };

            // Enhance calendar chart data
            const calendarData = {
                data: {
                    labels: data.calendarData.map(d => d.date),
                    datasets: [{
                        label: 'Commits',
                        data: data.calendarData.map(d => d.count),
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                            },
                        },
                        x: {
                            grid: {
                                display: false,
                            },
                        },
                    },
                },
            };

            return {
                ...data,
                weeklyChart: weeklyData,
                calendarChart: calendarData,
            };
        }
        return null;
    }, [commitActivity]);

    // Process repository commits
    const processedRepos = useMemo(() => {
        if (!repoCommits) return null;
        return processRepoCommits(repoCommits);
    }, [repoCommits]);

    // Update states when processed data changes
    useEffect(() => {
        if (processedData) {
            setWeeklyChart({
                data: processedData.weeklyChart.data,
                options: {
                    ...chartOptions,
                    ...processedData.weeklyChart.options,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                                font: {
                                    family: "'Inter', sans-serif",
                                },
                            },
                        },
                        x: {
                            grid: {
                                display: false,
                            },
                            ticks: {
                                font: {
                                    family: "'Inter', sans-serif",
                                },
                            },
                        },
                    },
                }
            });

            setCalendarChart({
                data: processedData.calendarChart.data,
                options: {
                    ...chartOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                            },
                        },
                        x: {
                            grid: {
                                display: false,
                            },
                        },
                    },
                }
            });

            setMaxCommits(processedData.maxCommits);
            setCommitStats(processedData.commitStats);
            setIsLoading(false);
        }
    }, [processedData]);

    // Update repository chart when processed repos change
    useEffect(() => {
        if (processedRepos) {
            setRepoChart({
                data: processedRepos.data,
                options: {
                    ...processedRepos.options,
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart' as const
                    }
                }
            });
            setProcessedRepoCommits(processedRepos);
        }
    }, [processedRepos]);

    if (isLoading || !processedData || !processedRepos) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading commit data...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.heading}>Commit Activity</h2>
                <div className={styles.timeRangeSelector}>
                    <button
                        className={`${styles.timeButton} ${selectedTimeRange === 'week' ? styles.active : ''}`}
                        onClick={() => setSelectedTimeRange('week')}
                    >
                        Week
                    </button>
                    <button
                        className={`${styles.timeButton} ${selectedTimeRange === 'month' ? styles.active : ''}`}
                        onClick={() => setSelectedTimeRange('month')}
                    >
                        Month
                    </button>
                    <button
                        className={`${styles.timeButton} ${selectedTimeRange === 'year' ? styles.active : ''}`}
                        onClick={() => setSelectedTimeRange('year')}
                    >
                        Year
                    </button>
                </div>
            </div>

            <div className={styles.statsContainer}>
                <div
                    className={`${styles.statCard} ${hoveredStat === 'total' ? styles.hovered : ''}`}
                    onMouseEnter={() => setHoveredStat('total')}
                    onMouseLeave={() => setHoveredStat(null)}
                >
                    <h3>Total Commits</h3>
                    <p>{commitStats.totalCommits.toLocaleString()}</p>
                    <small>Across all repositories</small>
                    <div className={styles.statIcon}>📊</div>
                </div>
                <div
                    className={`${styles.statCard} ${hoveredStat === 'average' ? styles.hovered : ''}`}
                    onMouseEnter={() => setHoveredStat('average')}
                    onMouseLeave={() => setHoveredStat(null)}
                >
                    <h3>Average Commits/Week</h3>
                    <p>{commitStats.averageCommitsPerWeek.toFixed(1)}</p>
                    <small>Last 12 weeks</small>
                    <div className={styles.statIcon}>📈</div>
                </div>
                <div
                    className={`${styles.statCard} ${hoveredStat === 'active' ? styles.hovered : ''}`}
                    onMouseEnter={() => setHoveredStat('active')}
                    onMouseLeave={() => setHoveredStat(null)}
                >
                    <h3>Most Active Day</h3>
                    <p>{commitStats.mostActiveDay}</p>
                    <small>{commitStats.mostActiveDayCount} commits</small>
                    <div className={styles.statIcon}>🔥</div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartContainer}>
                    <h3>Repository Distribution</h3>
                    <div className={styles.chartWrapper}>
                        {repoChart && <Pie data={repoChart.data} options={repoChart.options} />}
                    </div>
                </div>

                <div className={styles.chartContainer}>
                    <h3>Weekly Commit Activity</h3>
                    <div className={styles.chartWrapper}>
                        {weeklyChart && <Bar data={weeklyChart.data} options={weeklyChart.options} />}
                    </div>
                </div>

                <div className={styles.chartContainer}>
                    <h3>Commit Calendar</h3>
                    <div className={styles.chartWrapper}>
                        {calendarChart && <Line data={calendarChart.data} options={calendarChart.options} />}
                    </div>
                </div>
            </div>

            <div className={styles.disclaimer}>
                <p>Note: GitHub API limitations may affect the accuracy of commit data.</p>
            </div>
        </div>
    );
};

export default CommitChart;