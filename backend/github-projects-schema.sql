USE smart_placement_portal;

CREATE TABLE IF NOT EXISTS github_projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    repo_url VARCHAR(500) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    repo_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    default_branch VARCHAR(255) NULL,
    primary_language VARCHAR(100) NULL,
    stars INT NOT NULL DEFAULT 0,
    forks INT NOT NULL DEFAULT 0,
    repo_data JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_github_projects_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_github_projects_user_repo
        UNIQUE (user_id, repo_url),
    INDEX idx_github_projects_user (user_id)
);

CREATE TABLE IF NOT EXISTS github_project_analyses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    target_role VARCHAR(255) NULL,
    target_company VARCHAR(255) NULL,
    overall_score DECIMAL(5,2) NULL,
    relevance_summary TEXT NULL,
    detected_technologies JSON NULL,
    strengths JSON NULL,
    missing_skills JSON NULL,
    recommendations JSON NULL,
    next_project_ideas JSON NULL,
    interview_questions JSON NULL,
    analysis_result JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_github_project_analyses_project
        FOREIGN KEY (project_id) REFERENCES github_projects(id) ON DELETE CASCADE,
    INDEX idx_github_project_analyses_project (project_id),
    INDEX idx_github_project_analyses_created (created_at)
);
