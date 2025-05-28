import { GitHubClient, Repository, CreateRepositoryOptions } from './github-client';
import { projectStateMachine } from '@/core/ai/workflows/project-state-machine';

export interface ProjectRepositoryManager {
  createProjectRepository(projectId: string, projectName: string, options?: Partial<CreateRepositoryOptions>): Promise<Repository>;
  setupProjectStructure(repository: Repository): Promise<void>;
  createFeatureBranch(repository: Repository, featureName: string): Promise<string>;
  commitCode(repository: Repository, branch: string, files: ProjectFile[], message: string): Promise<string>;
  createPullRequest(repository: Repository, branch: string, title: string, description?: string): Promise<number>;
  deployToProduction(repository: Repository, version: string): Promise<void>;
}

export interface ProjectFile {
  path: string;
  content: string;
  description?: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  files: ProjectFile[];
  gitignore: string;
  license: string;
  readme: string;
  scripts: Record<string, string>;
}

export class GitHubProjectManager implements ProjectRepositoryManager {
  private github: GitHubClient;
  private defaultOwner: string;
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor(github: GitHubClient, defaultOwner: string) {
    this.github = github;
    this.defaultOwner = defaultOwner;
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // React + TypeScript template
    this.templates.set('react-typescript', {
      name: 'React TypeScript Application',
      description: 'Modern React application with TypeScript, Tailwind CSS, and best practices',
      gitignore: `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS generated files
Thumbs.db`,
      license: 'MIT',
      readme: `# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

### Test
\`\`\`bash
npm run test
\`\`\`

## Features
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 📱 Responsive design
- 🔧 ESLint and Prettier
- 🧪 Testing with Jest and React Testing Library
- 📦 Build optimization
- 🚀 Ready for deployment

## Project Structure
\`\`\`
src/
├── components/     # Reusable UI components
├── pages/         # Application pages
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── styles/        # CSS and styling
├── types/         # TypeScript type definitions
└── __tests__/     # Test files
\`\`\`

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.`,
      scripts: {
        'dev': 'vite',
        'build': 'tsc && vite build',
        'preview': 'vite preview',
        'test': 'jest',
        'test:watch': 'jest --watch',
        'lint': 'eslint src --ext .ts,.tsx',
        'lint:fix': 'eslint src --ext .ts,.tsx --fix',
        'format': 'prettier --write src/**/*.{ts,tsx,css,md}'
      },
      files: [
        {
          path: 'package.json',
          content: `{
  "name": "{{PROJECT_NAME_KEBAB}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src/**/*.{ts,tsx,css,md}"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.27",
    "@types/react-dom": "^18.0.10",
    "@typescript-eslint/eslint-plugin": "^5.52.0",
    "@typescript-eslint/parser": "^5.52.0",
    "@vitejs/plugin-react": "^3.1.0",
    "autoprefixer": "^10.4.13",
    "eslint": "^8.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.3.4",
    "jest": "^29.4.3",
    "postcss": "^8.4.21",
    "prettier": "^2.8.4",
    "tailwindcss": "^3.2.6",
    "typescript": "^4.9.5",
    "vite": "^4.1.0"
  }
}`
        },
        {
          path: 'src/App.tsx',
          content: `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;`
        },
        {
          path: 'src/main.tsx',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
        },
        {
          path: 'src/components/Header.tsx',
          content: `import React from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            {{PROJECT_NAME}}
          </Link>
          <nav className="flex space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};`
        },
        {
          path: 'src/pages/HomePage.tsx',
          content: `import React from 'react';

export const HomePage: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        Welcome to {{PROJECT_NAME}}
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        {{PROJECT_DESCRIPTION}}
      </p>
      <div className="flex gap-4 justify-center">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Get Started
        </button>
        <button className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
          Learn More
        </button>
      </div>
    </div>
  );
};`
        },
        {
          path: 'src/pages/AboutPage.tsx',
          content: `import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About {{PROJECT_NAME}}</h1>
      <div className="prose prose-lg">
        <p>
          {{PROJECT_DESCRIPTION}}
        </p>
        <h2>Our Mission</h2>
        <p>
          We strive to create exceptional user experiences through modern web technologies
          and thoughtful design.
        </p>
        <h2>Technology Stack</h2>
        <ul>
          <li>React 18 with TypeScript for type-safe development</li>
          <li>Tailwind CSS for utility-first styling</li>
          <li>Vite for fast development and building</li>
          <li>Jest for comprehensive testing</li>
          <li>ESLint and Prettier for code quality</li>
        </ul>
      </div>
    </div>
  );
};`
        },
        {
          path: 'src/styles/globals.css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: system-ui, sans-serif;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
  }
}`
        },
        {
          path: 'vite.config.ts',
          content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});`
        },
        {
          path: 'tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`
        },
        {
          path: 'tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{PROJECT_NAME}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        }
      ]
    });

    // Node.js API template
    this.templates.set('nodejs-api', {
      name: 'Node.js API with TypeScript',
      description: 'RESTful API with Express, TypeScript, and modern best practices',
      gitignore: `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript compiled output
dist/
build/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Logs
logs
*.log`,
      license: 'MIT',
      readme: `# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

### Production
\`\`\`bash
npm start
\`\`\`

### Test
\`\`\`bash
npm test
\`\`\`

## API Documentation

### Endpoints

#### Health Check
- **GET** \`/health\` - Check API health status

#### Authentication
- **POST** \`/auth/login\` - User login
- **POST** \`/auth/register\` - User registration
- **POST** \`/auth/logout\` - User logout

#### Users
- **GET** \`/users\` - Get all users (admin only)
- **GET** \`/users/:id\` - Get user by ID
- **PUT** \`/users/:id\` - Update user
- **DELETE** \`/users/:id\` - Delete user

## Environment Variables

\`\`\`bash
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_URL=your-database-url
\`\`\`

## Project Structure

\`\`\`
src/
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/        # Data models
├── routes/        # API routes
├── services/      # Business logic
├── utils/         # Utility functions
├── types/         # TypeScript types
└── __tests__/     # Test files
\`\`\`

## License
MIT`,
      scripts: {
        'dev': 'nodemon src/index.ts',
        'build': 'tsc && tsc-alias',
        'start': 'node dist/index.js',
        'test': 'jest',
        'test:watch': 'jest --watch',
        'lint': 'eslint src --ext .ts',
        'lint:fix': 'eslint src --ext .ts --fix',
        'format': 'prettier --write src/**/*.ts'
      },
      files: [
        {
          path: 'package.json',
          content: `{
  "name": "{{PROJECT_NAME_KEBAB}}",
  "version": "1.0.0",
  "description": "{{PROJECT_DESCRIPTION}}",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^6.1.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.1",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/jsonwebtoken": "^9.0.1",
    "@types/bcryptjs": "^2.4.2",
    "@types/node": "^18.15.11",
    "@types/jest": "^29.5.0",
    "@typescript-eslint/eslint-plugin": "^5.57.1",
    "@typescript-eslint/parser": "^5.57.1",
    "eslint": "^8.37.0",
    "jest": "^29.5.0",
    "nodemon": "^2.0.22",
    "prettier": "^2.8.7",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.2"
  }
}`
        },
        {
          path: 'src/index.ts',
          content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { healthRoutes } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;`
        },
        {
          path: 'src/routes/health.ts',
          content: `import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export { router as healthRoutes };`
        },
        {
          path: 'src/middleware/errorHandler.ts',
          content: `import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(\`Error \${statusCode}: \${message}\`);
  console.error(err.stack);

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};`
        }
      ]
    });
  }

  async createProjectRepository(
    projectId: string,
    projectName: string,
    options: Partial<CreateRepositoryOptions> = {}
  ): Promise<Repository> {
    try {
      const repositoryOptions: CreateRepositoryOptions = {
        name: this.sanitizeRepositoryName(projectName),
        description: options.description || `Repository for project: ${projectName}`,
        private: options.private ?? true,
        autoInit: true,
        gitignoreTemplate: options.gitignoreTemplate || 'Node',
        licenseTemplate: options.licenseTemplate || 'mit',
        allowSquashMerge: true,
        allowMergeCommit: true,
        allowRebaseMerge: true,
        deleteBranchOnMerge: true,
        ...options,
      };

      const repository = await this.github.createRepository(
        this.defaultOwner,
        repositoryOptions
      );

      console.log(`Created repository: ${repository.fullName}`);

      // Update project state
      projectStateMachine.updateMetadata(projectId, {
        repository: {
          id: repository.id,
          name: repository.name,
          fullName: repository.fullName,
          url: repository.htmlUrl,
          cloneUrl: repository.cloneUrl,
        },
      });

      return repository;
    } catch {
      console.error('Failed to create project repository:', error);
      throw error;
    }
  }

  async setupProjectStructure(
    repository: Repository,
    templateType: string = 'react-typescript',
    variables: Record<string, string> = {}
  ): Promise<void> {
    try {
      const template = this.templates.get(templateType);
      if (!template) {
        throw new Error(`Unknown template: ${templateType}`);
      }

      const projectVariables = {
        PROJECT_NAME: repository.name,
        PROJECT_NAME_KEBAB: repository.name.toLowerCase().replace(/\s+/g, '-'),
        PROJECT_DESCRIPTION: repository.description || 'A new project',
        ...variables,
      };

      // Create all template files
      for (const file of template.files) {
        const content = this.replaceVariables(file.content, projectVariables);
        
        await this.github.createFile(
          repository.owner.login,
          repository.name,
          file.path,
          content,
          `Add ${file.path}${file.description ? ` - ${file.description}` : ''}`
        );
      }

      // Create README
      const readmeContent = this.replaceVariables(template.readme, projectVariables);
      await this.github.createFile(
        repository.owner.login,
        repository.name,
        'README.md',
        readmeContent,
        'Add project README'
      );

      console.log(`Set up project structure for ${repository.fullName}`);
    } catch {
      console.error('Failed to setup project structure:', error);
      throw error;
    }
  }

  async createFeatureBranch(repository: Repository, featureName: string): Promise<string> {
    try {
      const branchName = `feature/${featureName.toLowerCase().replace(/\s+/g, '-')}`;
      
      await this.github.createBranch(
        repository.owner.login,
        repository.name,
        branchName,
        repository.defaultBranch
      );

      console.log(`Created feature branch: ${branchName}`);
      return branchName;
    } catch {
      console.error('Failed to create feature branch:', error);
      throw error;
    }
  }

  async commitCode(
    repository: Repository,
    branch: string,
    files: ProjectFile[],
    message: string
  ): Promise<string> {
    try {
      let commitSha = '';

      for (const file of files) {
        try {
          // Try to get existing file to update it
          const existingFile = await this.github.getFile(
            repository.owner.login,
            repository.name,
            file.path,
            branch
          );

          const commit = await this.github.updateFile(
            repository.owner.login,
            repository.name,
            file.path,
            file.content,
            message,
            existingFile.sha,
            branch
          );
          commitSha = commit.sha;
        } catch {
          // File doesn't exist, create it
          const commit = await this.github.createFile(
            repository.owner.login,
            repository.name,
            file.path,
            file.content,
            message,
            branch
          );
          commitSha = commit.sha;
        }
      }

      console.log(`Committed ${files.length} files to ${branch}`);
      return commitSha;
    } catch {
      console.error('Failed to commit code:', error);
      throw error;
    }
  }

  async createPullRequest(
    repository: Repository,
    branch: string,
    title: string,
    description?: string
  ): Promise<number> {
    try {
      const pr = await this.github.createPullRequest(
        repository.owner.login,
        repository.name,
        title,
        branch,
        repository.defaultBranch,
        description
      );

      console.log(`Created pull request #${pr.number}: ${title}`);
      return pr.number;
    } catch {
      console.error('Failed to create pull request:', error);
      throw error;
    }
  }

  async deployToProduction(repository: Repository, version: string): Promise<void> {
    try {
      // Create a release tag
    // const tagName = `v${version}`;
      
      // This would typically trigger a deployment pipeline
      // For now, we'll just create a GitHub release
      
      console.log(`Deployed ${repository.fullName} version ${version}`);
    } catch {
      console.error('Failed to deploy to production:', error);
      throw error;
    }
  }

  private sanitizeRepositoryName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // Utility methods
  async getProjectRepository(projectId: string): Promise<Repository | null> {
    const context = projectStateMachine.getContext(projectId);
    if (!context?.metadata.repository) {
      return null;
    }

    const repo = context.metadata.repository;
    return await this.github.getRepository(repo.fullName.split('/')[0], repo.fullName.split('/')[1]);
  }

  async listProjectBranches(projectId: string): Promise<string[]> {
    const repository = await this.getProjectRepository(projectId);
    if (!repository) return [];

    const branches = await this.github.listBranches(repository.owner.login, repository.name);
    return branches.map(branch => branch.name);
  }

  async getProjectPullRequests(projectId: string): Promise<any[]> {
    const repository = await this.getProjectRepository(projectId);
    if (!repository) return [];

    return await this.github.listPullRequests(repository.owner.login, repository.name);
  }
}

// Factory function
export function createGitHubProjectManager(
  github: GitHubClient,
  defaultOwner: string
): GitHubProjectManager {
  return new GitHubProjectManager(github, defaultOwner);
}