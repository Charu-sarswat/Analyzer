import React, { useState } from 'react';
import styles from '@/styles/RepositoryList.module.css';

interface Repository {
    id: number;
    name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    forks_count: number;
    language: string;
}

interface RepositoryListProps {
    repositories: Repository[];
}

const RepositoryList: React.FC<RepositoryListProps> = ({ repositories }) => {
    const [sortBy, setSortBy] = useState<'name' | 'stars'>('stars');
    const [filterLanguage, setFilterLanguage] = useState<string>('');

    // Get unique languages from repositories
    const languages = Array.from(new Set(repositories.map(repo => repo.language).filter(Boolean))) as string[];

    // Sort and filter repositories
    const sortedRepos = [...repositories]
        .filter(repo => !filterLanguage || repo.language === filterLanguage)
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else {
                return b.stargazers_count - a.stargazers_count;
            }
        });

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Repositories ({repositories.length})</h2>

            <div className={styles.filters}>
                <div className={styles.sortOptions}>
                    <label>Sort by: </label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'stars')}
                        className={styles.select}
                    >
                        <option value="stars">Stars</option>
                        <option value="name">Name</option>
                    </select>
                </div>

                <div className={styles.languageFilter}>
                    <label>Filter by language: </label>
                    <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">All languages</option>
                        {languages.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.repoList}>
                {sortedRepos.length > 0 ? (
                    sortedRepos.map((repo) => (
                        <div key={repo.id} className={styles.repo}>
                            <h3 className={styles.repoName}>
                                <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                                    {repo.name}
                                </a>
                            </h3>

                            {repo.description && (
                                <p className={styles.description}>{repo.description}</p>
                            )}

                            <div className={styles.repoDetails}>
                                {repo.language && (
                                    <span className={styles.language}>{repo.language}</span>
                                )}

                                <span className={styles.stars}>
                                    <span className={styles.icon}>⭐</span> {repo.stargazers_count}
                                </span>

                                <span className={styles.forks}>
                                    <span className={styles.icon}>🍴</span> {repo.forks_count}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={styles.noRepos}>
                        {filterLanguage ? `No repositories found with ${filterLanguage}` : 'No repositories found'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default RepositoryList; 