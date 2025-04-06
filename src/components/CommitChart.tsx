import React, { useEffect, useState } from 'react';
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
    Legend
);

interface CommitActivity {
    days: number[];
    total: number;
    week: number;
}

interface RepoCommitInfo {
    name: string;
    commits: number;
}

interface CommitChartProps {
    commitActivity: CommitActivity[];
    repoCommits?: RepoCommitInfo[];
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

const CommitChart: React.FC<CommitChartProps> = ({ commitActivity, repoCommits = [] }) => {
    const [chartData, setChartData] = useState<any>(null);
    const [dailyTrend, setDailyTrend] = useState<any>(null);
    const [calendarData, setCalendarData] = useState<Array<{ date: string, count: number }>>([]);
    const [maxCommits, setMaxCommits] = useState(0);
    const [commitStats, setCommitStats] = useState<{
        totalCommits: number;
        averagePerWeek: number;
        mostActiveDay: string;
        mostActiveDayCount: number;
    }>({
        totalCommits: 0,
        averagePerWeek: 0,
        mostActiveDay: '',
        mostActiveDayCount: 0
    });
    const [repoDistribution, setRepoDistribution] = useState<any>(null);

    useEffect(() => {
        if (!commitActivity || commitActivity.length === 0) return;

        // Process commit activity data for chart
        processCommitData();

        // Process repository commit distribution
        if (repoCommits && repoCommits.length > 0) {
            processRepoCommits();
        }
    }, [commitActivity, repoCommits]);

    const processRepoCommits = () => {
        if (!repoCommits || repoCommits.length === 0) return;

        // Calculate total commits across all repos
        const totalCommits = repoCommits.reduce((sum, repo) => sum + repo.commits, 0);

        // Prepare data for pie chart
        const repoLabels = repoCommits.map(repo => repo.name);
        const repoData = repoCommits.map(repo => repo.commits);
        const repoPercentages = repoCommits.map(repo =>
            Math.round((repo.commits / totalCommits) * 100)
        );

        // Chart data
        const pieData = {
            labels: repoLabels,
            datasets: [
                {
                    data: repoData,
                    backgroundColor: pieChartColors.slice(0, repoCommits.length),
                    borderColor: pieChartColors.slice(0, repoCommits.length).map(color => color.replace('0.7', '1')),
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

        setRepoDistribution({
            data: pieData,
            options: pieOptions,
            repoStats: repoCommits.map((repo, index) => ({
                name: repo.name,
                commits: repo.commits,
                percentage: repoPercentages[index],
                color: pieChartColors[index % pieChartColors.length]
            }))
        });
    };

    const processCommitData = () => {
        // Make sure we have valid data
        if (!commitActivity || !Array.isArray(commitActivity) || commitActivity.length === 0) {
            console.log("No commit activity data available");
            return;
        }

        try {
            // Get last 12 weeks of data or all available data
            const lastWeeks = commitActivity.slice(-12);

            if (!lastWeeks.length) {
                console.log("No weekly data available");
                return;
            }

            // Get week labels
            const weekLabels = lastWeeks.map(week => {
                const date = new Date(week.week * 1000); // Convert Unix timestamp to date
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });

            // Get daily commit counts
            const dailyData = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat

            // Sum up commits by day of week
            lastWeeks.forEach(week => {
                if (Array.isArray(week.days)) {
                    for (let i = 0; i < 7; i++) {
                        dailyData[i] += week.days[i] || 0;
                    }
                }
            });

            // Calculate commit statistics
            const totalCommits = lastWeeks.reduce((sum, week) => sum + (week.total || 0), 0);
            const averagePerWeek = totalCommits / lastWeeks.length;

            // Find most active day
            const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const mostActiveDayIndex = dailyData.indexOf(Math.max(...dailyData));
            const mostActiveDay = dayLabels[mostActiveDayIndex];
            const mostActiveDayCount = dailyData[mostActiveDayIndex];

            // Set commit statistics
            setCommitStats({
                totalCommits,
                averagePerWeek: Math.round(averagePerWeek * 10) / 10, // Round to 1 decimal
                mostActiveDay,
                mostActiveDayCount
            });

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

            // Prepare daily chart data
            const dailyChartData = {
                labels: dayLabels,
                datasets: [
                    {
                        label: 'Commits by Day of Week',
                        data: dailyData,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    }
                ]
            };

            const dailyChartOptions = {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top' as const,
                    },
                    title: {
                        display: true,
                        text: 'Commits by Day of Week',
                    },
                },
            };

            // Create a detailed daily commit trend
            // Flatten the commits per day for the entire period
            const allDailyCommits: Array<{ date: string, count: number }> = [];

            // Create dummy data if needed (for testing/debugging)
            if (lastWeeks.length === 0 || !lastWeeks[0].days) {
                // Generate 84 days (12 weeks) of sample data
                const today = new Date();
                for (let i = 83; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(today.getDate() - i);
                    allDailyCommits.push({
                        date: `${date.getMonth() + 1}/${date.getDate()}`,
                        count: Math.floor(Math.random() * 5) // Random count between 0-4
                    });
                }
            } else {
                lastWeeks.forEach(week => {
                    if (!week || !week.week || !Array.isArray(week.days)) {
                        console.warn("Invalid week data:", week);
                        return;
                    }

                    const weekStart = new Date(week.week * 1000);

                    for (let i = 0; i < 7; i++) {
                        const currentDay = new Date(weekStart);
                        currentDay.setDate(weekStart.getDate() + i);

                        allDailyCommits.push({
                            date: `${currentDay.getMonth() + 1}/${currentDay.getDate()}`,
                            count: week.days[i] || 0
                        });
                    }
                });
            }

            // Sort by date
            allDailyCommits.sort((a, b) => {
                const dateA = new Date(`2023/${a.date}`); // Add year to make parsing reliable
                const dateB = new Date(`2023/${b.date}`);
                return dateA.getTime() - dateB.getTime();
            });

            // Find maximum commits for color scaling
            const maxCount = Math.max(...allDailyCommits.map(day => day.count), 1); // Ensure at least 1
            setMaxCommits(maxCount);
            setCalendarData(allDailyCommits);

            const dailyTrendData = {
                labels: allDailyCommits.map(day => day.date),
                datasets: [
                    {
                        label: 'Daily Commits',
                        data: allDailyCommits.map(day => day.count),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        tension: 0.1,
                        fill: true,
                    }
                ]
            };

            const dailyTrendOptions = {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top' as const,
                    },
                    title: {
                        display: true,
                        text: 'Daily Commit Activity',
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Commits'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                }
            };

            setChartData({
                weekly: { data: weeklyChartData, options: weeklyChartOptions },
                daily: { data: dailyChartData, options: dailyChartOptions }
            });

            setDailyTrend({
                data: dailyTrendData,
                options: dailyTrendOptions
            });
        } catch (error) {
            console.error("Error processing commit data:", error);
        }
    };

    // Group data by weeks for the heat map
    const renderCalendarHeatmap = () => {
        if (!calendarData.length) {
            return (
                <div className={styles.heatmapContainer}>
                    <h3 className={styles.subheading}>Commit Calendar (GitHub Style)</h3>
                    <div className={styles.noDataMessage}>
                        No commit activity data available to display calendar.
                    </div>
                </div>
            );
        }

        // Group by weeks
        const weeks: Array<{ week: string, days: Array<{ date: string, count: number }> }> = [];
        let currentWeek: Array<{ date: string, count: number }> = [];
        let weekStartDate = '';

        try {
            // Ensure we have 7 days per week
            const filledData = [...calendarData];

            // Fill any missing days
            if (filledData.length % 7 !== 0) {
                const remainder = filledData.length % 7;
                const lastDate = new Date(`2023/${filledData[filledData.length - 1].date}`);

                for (let i = 1; i <= 7 - remainder; i++) {
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(lastDate.getDate() + i);
                    filledData.push({
                        date: `${nextDate.getMonth() + 1}/${nextDate.getDate()}`,
                        count: 0
                    });
                }
            }

            filledData.forEach((day, index) => {
                // Start new week on Sunday or every 7 days
                if (index % 7 === 0) {
                    if (currentWeek.length > 0) {
                        weeks.push({
                            week: weekStartDate,
                            days: [...currentWeek]
                        });
                    }
                    currentWeek = [];
                    weekStartDate = day.date;
                }
                currentWeek.push(day);
            });

            // Add the last week
            if (currentWeek.length > 0) {
                weeks.push({
                    week: weekStartDate,
                    days: [...currentWeek]
                });
            }
        } catch (error) {
            console.error("Error rendering heatmap:", error);
            return (
                <div className={styles.heatmapContainer}>
                    <h3 className={styles.subheading}>Commit Calendar (GitHub Style)</h3>
                    <div className={styles.noDataMessage}>
                        Error rendering commit calendar.
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.heatmapContainer}>
                <h3 className={styles.subheading}>Commit Calendar (GitHub Style)</h3>
                <div className={styles.heatmapLabel}>
                    <div className={styles.heatmapDayLabels}>
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>
                </div>
                <div className={styles.heatmap}>
                    {weeks.map((week, weekIndex) => (
                        <div key={`week-${weekIndex}`} className={styles.heatmapWeek}>
                            <div className={styles.weekLabel}>{week.week}</div>
                            <div className={styles.heatmapDays}>
                                {week.days.map((day, dayIndex) => (
                                    <div
                                        key={`day-${weekIndex}-${dayIndex}`}
                                        className={styles.heatmapDay}
                                        style={{ backgroundColor: getHeatMapColor(day.count) }}
                                        title={`${day.date}: ${day.count} commits`}
                                    >
                                        <span className={styles.dayTooltip}>
                                            {day.date}: {day.count} commits
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.heatmapLegend}>
                    <div>Less</div>
                    <div className={styles.heatmapLegendItem} style={{ backgroundColor: '#ebedf0' }}></div>
                    <div className={styles.heatmapLegendItem} style={{ backgroundColor: '#9be9a8' }}></div>
                    <div className={styles.heatmapLegendItem} style={{ backgroundColor: '#40c463' }}></div>
                    <div className={styles.heatmapLegendItem} style={{ backgroundColor: '#30a14e' }}></div>
                    <div className={styles.heatmapLegendItem} style={{ backgroundColor: '#216e39' }}></div>
                    <div>More</div>
                </div>
            </div>
        );
    };

    if (!chartData) {
        return <div className={styles.loading}>Processing commit data...</div>;
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Commit Activity</h2>

            <div className={styles.commitStats}>
                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{commitStats.totalCommits}</span>
                    </div>
                    <div className={styles.statLabel}>Total Commits</div>
                    <div className={styles.statIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{commitStats.averagePerWeek}</span>
                    </div>
                    <div className={styles.statLabel}>Avg. Commits per Week</div>
                    <div className={styles.statIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statValue}>
                        <span className={styles.statDay}>{commitStats.mostActiveDay}</span>
                    </div>
                    <div className={styles.statLabel}>Most Active Day</div>
                    <div className={styles.statSubLabel}>({commitStats.mostActiveDayCount} commits)</div>
                    <div className={styles.statIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                </div>
            </div>

            {repoDistribution && (
                <div className={`${styles.repoDistribution} ${styles.floating}`}>
                    <h3 className={styles.subheading}>Repository Contributions</h3>

                    <div className={styles.repoChartContainer}>
                        <div className={styles.repoPieChart}>
                            <Pie data={repoDistribution.data} options={repoDistribution.options} />
                            <div className={styles.pieChartOverlay}>
                                <div className={styles.pieChartCenterText}>
                                    <span>{repoDistribution.repoStats.reduce((sum: number, repo: any) => sum + repo.commits, 0)}</span>
                                    <small>Total</small>
                                </div>
                            </div>
                        </div>

                        <div className={styles.repoStatsList}>
                            {repoDistribution.repoStats.map((repo: any, index: number) => (
                                <div key={index} className={styles.repoStatItem}>
                                    <div
                                        className={styles.repoColorIndicator}
                                        style={{ backgroundColor: repo.color }}
                                    ></div>
                                    <div className={styles.repoName}>{repo.name}</div>
                                    <div className={styles.repoCommits}>{repo.commits} commits</div>
                                    <div className={styles.repoPercentage}>
                                        <div className={styles.percentCircle} style={{
                                            background: `conic-gradient(${repo.color} 0% ${repo.percentage}%, transparent ${repo.percentage}% 100%)`
                                        }}></div>
                                        <span>{repo.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {renderCalendarHeatmap()}

            <div className={styles.dailyTrendChart}>
                <h3 className={styles.subheading}>Daily Commit Timeline</h3>
                <Line data={dailyTrend.data} options={dailyTrend.options} />
            </div>

            <div className={styles.charts}>
                <div className={styles.chart}>
                    <h3 className={styles.subheading}>Weekly Activity</h3>
                    <Bar data={chartData.weekly.data} options={chartData.weekly.options} />
                </div>

                <div className={styles.chart}>
                    <h3 className={styles.subheading}>Day of Week Analysis</h3>
                    <Bar data={chartData.daily.data} options={chartData.daily.options} />
                </div>
            </div>

            <div className={styles.disclaimer}>
                <p>Note: GitHub API provides commit data for up to 12 weeks. Chart shows data for available repositories (max 5 to avoid API rate limits).</p>
            </div>
        </div>
    );
};

export default CommitChart; 