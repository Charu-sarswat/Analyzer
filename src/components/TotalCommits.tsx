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
    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Commit Statistics</h2>
            <div className={styles.commitStats}>
                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>📊</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{totalCommits}</span>
                    </div>
                    <div className={styles.statLabel}>Total Commits</div>
                    <div className={styles.statSubLabel}>All time</div>
                </div>

                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>📈</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{averageCommitsPerWeek.toFixed(1)}</span>
                    </div>
                    <div className={styles.statLabel}>Average Commits</div>
                    <div className={styles.statSubLabel}>Per week</div>
                </div>

                <div className={`${styles.statCard} ${styles.pulseOnHover}`}>
                    <div className={styles.statIcon}>🔥</div>
                    <div className={styles.statValue}>
                        <span className={styles.statCounter}>{mostActiveDayCount}</span>
                    </div>
                    <div className={styles.statLabel}>Most Active Day</div>
                    <div className={styles.statSubLabel}>
                        <span className={styles.statDay}>{mostActiveDay}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TotalCommits; 