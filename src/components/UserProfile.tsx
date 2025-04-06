import React from 'react';
import styles from '@/styles/UserProfile.module.css';

interface UserProfileProps {
    user: {
        login: string;
        avatar_url: string;
        html_url: string;
        name: string | null;
        bio: string | null;
        blog: string | null;
        location: string | null;
        public_repos: number;
        followers: number;
        following: number;
        created_at: string;
    };
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
    const createdDate = new Date(user.created_at).toLocaleDateString();

    return (
        <div className={styles.profile}>
            <div className={styles.avatar}>
                <img src={user.avatar_url} alt={`${user.login}'s avatar`} />
            </div>
            <div className={styles.info}>
                <h2>
                    {user.name || user.login}
                    <a href={user.html_url} target="_blank" rel="noopener noreferrer" className={styles.username}>
                        @{user.login}
                    </a>
                </h2>

                {user.bio && <p className={styles.bio}>{user.bio}</p>}

                <div className={styles.details}>
                    {user.location && (
                        <span className={styles.detail}>
                            <span className={styles.icon}>📍</span> {user.location}
                        </span>
                    )}

                    {user.blog && (
                        <span className={styles.detail}>
                            <span className={styles.icon}>🔗</span>
                            <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer">
                                {user.blog}
                            </a>
                        </span>
                    )}

                    <span className={styles.detail}>
                        <span className={styles.icon}>📅</span> Joined {createdDate}
                    </span>
                </div>

                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.count}>{user.public_repos}</span>
                        <span className={styles.label}>Repositories</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.count}>{user.followers}</span>
                        <span className={styles.label}>Followers</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.count}>{user.following}</span>
                        <span className={styles.label}>Following</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile; 