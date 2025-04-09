import React from 'react';
import styles from '@/styles/TotalCommits.module.css';

interface TotalCommitsProps {
    totalCommits: number;
    averageCommitsPerWeek: number;
    mostActiveDay: string;
    mostActiveDayCount: number;
}

const TotalCommits: React.FC<TotalCommitsProps> = ({
    totalCommits,
    averageCommitsPerWeek,
    mostActiveDay,
    mostActiveDayCount
}) => {
    // Parse and validate GitHub data
    const displayTotalCommits = typeof totalCommits === 'number' ? totalCommits : 0;
    const displayAverage = (averageCommitsPerWeek || 0).toFixed(1);
    const formattedActiveDay = mostActiveDay 
        ? mostActiveDay.charAt(0).toUpperCase() + mostActiveDay.slice(1).toLowerCase()
        : 'N/A';
    const displayActiveDayCount = mostActiveDayCount || 0;

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Commit Statistics</h2>
            <div className={styles.commitStats}>
                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>📊</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{displayTotalCommits}</span>
                    </div>
                    <div className={styles.statLabel}>Total Commits</div>
                    <div className={styles.statSubLabel}>All time</div>
                </div>

                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>📈</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{displayAverage}</span>
                    </div>
                    <div className={styles.statLabel}>Average Commits</div>
                    <div className={styles.statSubLabel}>Per week</div>
                </div>

                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>🔥</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{displayActiveDayCount}</span>
                    </div>
                    <div className={styles.statLabel}>Most Active Day</div>
                    <div className={styles.statSubLabel}>
                        <span className={styles.statDay}>{formattedActiveDay}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TotalCommits;