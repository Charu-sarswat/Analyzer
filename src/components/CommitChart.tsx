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
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import styles from '@/styles/CommitChart.module.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface CommitActivity {
    days: number[];
    total: number;
    week: number;
}

interface CommitChartProps {
    commitActivity: CommitActivity[];
}

// Colors for heat map intensity
const getHeatMapColor = (intensity: number): string => {
    if (intensity === 0) return '#ebedf0';
    if (intensity <= 2) return '#9be9a8';
    if (intensity <= 5) return '#40c463';
    if (intensity <= 10) return '#30a14e';
    return '#216e39';
};

const CommitChart: React.FC<CommitChartProps> = ({ commitActivity }) => {
    const [chartData, setChartData] = useState<any>(null);
    const [dailyTrend, setDailyTrend] = useState<any>(null);
    const [calendarData, setCalendarData] = useState<Array<{ date: string, count: number }>>([]);
    const [maxCommits, setMaxCommits] = useState(0);

    useEffect(() => {
        if (!commitActivity || commitActivity.length === 0) return;

        // Process commit activity data for chart
        processCommitData();
    }, [commitActivity]);

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
            const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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