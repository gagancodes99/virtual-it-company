import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

export interface GitHubConfig {
  token?: string;
  appId?: string;
  privateKey?: string;
  installationId?: string;
  baseUrl?: string;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  owner: {
    login: string;
    id: number;
    avatarUrl: string;
    type: string;
  };
}

export interface CreateRepositoryOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
  allowSquashMerge?: boolean;
  allowMergeCommit?: boolean;
  allowRebaseMerge?: boolean;
  deleteBranchOnMerge?: boolean;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  mergeable?: boolean;
  merged: boolean;
  draft: boolean;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  htmlUrl: string;
  gitUrl: string;
  downloadUrl?: string;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  htmlUrl: string;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
  }>;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;

    if (config.appId && config.privateKey && config.installationId) {
      // GitHub App authentication
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: config.appId,
          privateKey: config.privateKey,
          installationId: config.installationId,
        },
        baseUrl: config.baseUrl || 'https://api.github.com',
      });
    } else if (config.token) {
      // Personal access token authentication
      this.octokit = new Octokit({
        auth: config.token,
        baseUrl: config.baseUrl || 'https://api.github.com',
      });
    } else {
      throw new Error('GitHub authentication required: provide either token or app credentials');
    }
  }

  // Repository Management
  async createRepository(
    owner: string,
    options: CreateRepositoryOptions
  ): Promise<Repository> {
    try {
      const response = await this.octokit.rest.repos.createForOrg({
        org: owner,
        name: options.name,
        description: options.description,
        private: options.private ?? true,
        auto_init: options.autoInit ?? true,
        gitignore_template: options.gitignoreTemplate,
        license_template: options.licenseTemplate,
        allow_squash_merge: options.allowSquashMerge ?? true,
        allow_merge_commit: options.allowMergeCommit ?? true,
        allow_rebase_merge: options.allowRebaseMerge ?? true,
        delete_branch_on_merge: options.deleteBranchOnMerge ?? true,
      });

      return this.transformRepository(response.data);
    } catch {
      if (error.status === 403) {
        // Try creating for user instead of org
        const response = await this.octokit.rest.repos.createForAuthenticatedUser({
          name: options.name,
          description: options.description,
          private: options.private ?? true,
          auto_init: options.autoInit ?? true,
          gitignore_template: options.gitignoreTemplate,
          license_template: options.licenseTemplate,
          allow_squash_merge: options.allowSquashMerge ?? true,
          allow_merge_commit: options.allowMergeCommit ?? true,
          allow_rebase_merge: options.allowRebaseMerge ?? true,
          delete_branch_on_merge: options.deleteBranchOnMerge ?? true,
        });

        return this.transformRepository(response.data);
      }
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return this.transformRepository(response.data);
    } catch {
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  async listRepositories(owner: string, type: 'all' | 'owner' | 'member' = 'owner'): Promise<Repository[]> {
    try {
      const response = await this.octokit.rest.repos.listForOrg({
        org: owner,
        type,
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      return response.data.map(repo => this.transformRepository(repo));
    } catch {
      if (error.status === 404) {
        // Try listing for user instead
        const response = await this.octokit.rest.repos.listForAuthenticatedUser({
          type,
          sort: 'updated',
          direction: 'desc',
          per_page: 100,
        });

        return response.data.map(repo => this.transformRepository(repo));
      }
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  }

  async deleteRepository(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.repos.delete({
        owner,
        repo,
      });
    } catch {
      throw new Error(`Failed to delete repository: ${error.message}`);
    }
  }

  // File Management
  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main'
  ): Promise<CommitInfo> {
    try {
      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      });

      return this.transformCommit(response.data.commit);
    } catch {
      throw new Error(`Failed to create file: ${error.message}`);
    }
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha: string,
    branch: string = 'main'
  ): Promise<CommitInfo> {
    try {
      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      });

      return this.transformCommit(response.data.commit);
    } catch {
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  async getFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Path refers to a directory, not a file');
      }

      const file = response.data as any;
      
      return {
        name: file.name,
        path: file.path,
        sha: file.sha,
        size: file.size,
        url: file.url,
        htmlUrl: file.html_url,
        gitUrl: file.git_url,
        downloadUrl: file.download_url,
        type: file.type,
        content: file.content ? Buffer.from(file.content, 'base64').toString('utf8') : undefined,
        encoding: file.encoding,
      };
    } catch {
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string = 'main'
  ): Promise<CommitInfo> {
    try {
      const response = await this.octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
      });

      return this.transformCommit(response.data.commit);
    } catch {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getDirectoryContents(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubFile[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Path refers to a file, not a directory');
      }

      return response.data.map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        url: item.url,
        htmlUrl: item.html_url,
        gitUrl: item.git_url,
        downloadUrl: item.download_url,
        type: item.type as 'file' | 'dir',
      }));
    } catch {
      throw new Error(`Failed to get directory contents: ${error.message}`);
    }
  }

  // Branch Management
  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main'): Promise<Branch> {
    try {
      // Get the SHA of the source branch
      const sourceRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create new branch
      const response = await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: sourceRef.data.object.sha,
      });

      return {
        name: branchName,
        commit: {
          sha: response.data.object.sha,
          url: response.data.object.url,
        },
        protected: false,
      };
    } catch {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  async listBranches(owner: string, repo: string): Promise<Branch[]> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return response.data.map(branch => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected,
      }));
    } catch {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    try {
      await this.octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      });
    } catch {
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }

  // Pull Request Management
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string = 'main',
    body?: string,
    draft: boolean = false
  ): Promise<PullRequest> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
        draft,
      });

      return this.transformPullRequest(response.data);
    } catch {
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state,
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      return response.data.map(pr => this.transformPullRequest(pr));
    } catch {
      throw new Error(`Failed to list pull requests: ${error.message}`);
    }
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    commitTitle?: string,
    commitMessage?: string,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    try {
      await this.octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: mergeMethod,
      });
    } catch {
      throw new Error(`Failed to merge pull request: ${error.message}`);
    }
  }

  // Webhook Management
  async createWebhook(
    owner: string,
    repo: string,
    url: string,
    events: string[] = ['push', 'pull_request'],
    secret?: string
  ): Promise<{ id: number; url: string }> {
    try {
      const response = await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url,
          content_type: 'json',
          secret,
        },
        events,
        active: true,
      });

      return {
        id: response.data.id,
        url: response.data.config.url,
      };
    } catch {
      throw new Error(`Failed to create webhook: ${error.message}`);
    }
  }

  // Utility methods
  private transformRepository(repo: any): Repository {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      defaultBranch: repo.default_branch,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      size: repo.size,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id,
        avatarUrl: repo.owner.avatar_url,
        type: repo.owner.type,
      },
    };
  }

  private transformPullRequest(pr: any): PullRequest {
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      htmlUrl: pr.html_url,
      user: {
        login: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      mergeable: pr.mergeable,
      merged: pr.merged,
      draft: pr.draft,
    };
  }

  private transformCommit(commit: any): CommitInfo {
    return {
      sha: commit.sha,
      message: commit.message,
      author: {
        name: commit.author.name,
        email: commit.author.email,
        date: commit.author.date,
      },
      committer: {
        name: commit.committer.name,
        email: commit.committer.email,
        date: commit.committer.date,
      },
      url: commit.url,
      htmlUrl: commit.html_url,
      tree: {
        sha: commit.tree.sha,
        url: commit.tree.url,
      },
      parents: commit.parents.map((parent: any) => ({
        sha: parent.sha,
        url: parent.url,
      })),
    };
  }

  // Health check
  async testConnection(): Promise<{ authenticated: boolean; user?: string; rateLimitRemaining: number }> {
    try {
      const [userResponse, rateLimitResponse] = await Promise.all([
        this.octokit.rest.users.getAuthenticated(),
        this.octokit.rest.rateLimit.get(),
      ]);

      return {
        authenticated: true,
        user: userResponse.data.login,
        rateLimitRemaining: rateLimitResponse.data.rate.remaining,
      };
    } catch {
      return {
        authenticated: false,
        rateLimitRemaining: 0,
      };
    }
  }
}

// Factory function
export function createGitHubClient(config?: GitHubConfig): GitHubClient {
  const finalConfig: GitHubConfig = {
    token: config?.token || process.env.GITHUB_TOKEN,
    appId: config?.appId || process.env.GITHUB_APP_ID,
    privateKey: config?.privateKey || process.env.GITHUB_PRIVATE_KEY,
    installationId: config?.installationId || process.env.GITHUB_INSTALLATION_ID,
    baseUrl: config?.baseUrl || process.env.GITHUB_API_URL,
    ...config,
  };

  return new GitHubClient(finalConfig);
}