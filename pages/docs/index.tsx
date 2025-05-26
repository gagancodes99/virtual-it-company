import React from 'react';
import { DocumentationLayout } from '@/components/DocumentationLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Zap, 
  Users, 
  Bot, 
  GitBranch,
  DollarSign,
  BarChart,
  Clock,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function DocumentationHome() {
  return (
    <DocumentationLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Virtual IT Company Platform Documentation
          </h1>
          <p className="text-xl text-muted-foreground">
            Build and operate an autonomous AI-powered software development company that works 24/7
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/docs/quick-start">
                Quick Start <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://github.com/yourusername/vitc-platform">
                <GitBranch className="mr-2 h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Bot className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>AI-Powered Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Specialized AI agents handle different roles - PM, Developer, Tester, DevOps
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>24/7 Automation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Fully automated project lifecycle from requirements to deployment
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Cost Optimized</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Smart LLM routing keeps operational costs under $200/month
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Multi-Project</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Handle 5-20+ concurrent client projects efficiently
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Real-time Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor performance, costs, and client satisfaction in real-time
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Enterprise Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Security, scalability, and reliability built-in from day one
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Quick Links</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
              <Link href="/docs/architecture">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    System Architecture
                    <ArrowRight className="ml-auto h-5 w-5" />
                  </CardTitle>
                  <CardDescription>
                    Understand the platform's architecture, components, and data flow
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
              <Link href="/docs/implementation-guide">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    Implementation Guide
                    <ArrowRight className="ml-auto h-5 w-5" />
                  </CardTitle>
                  <CardDescription>
                    Step-by-step guide to building the platform from scratch
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
              <Link href="/docs/api-documentation">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    API Documentation
                    <ArrowRight className="ml-auto h-5 w-5" />
                  </CardTitle>
                  <CardDescription>
                    Complete API reference with examples and integration guides
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
              <Link href="/docs/deployment">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    Deployment Guide
                    <ArrowRight className="ml-auto h-5 w-5" />
                  </CardTitle>
                  <CardDescription>
                    Deploy to production with various hosting options and scaling strategies
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>

        {/* Getting Started Steps */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Clone and Setup</h3>
                <p className="text-muted-foreground">
                  Clone the repository and run the automated setup script to configure all services
                </p>
                <pre className="bg-muted p-2 rounded text-sm">
                  <code>git clone https://github.com/yourusername/vitc-platform.git</code>
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Configure Environment</h3>
                <p className="text-muted-foreground">
                  Set up your environment variables with AI API keys and service configurations
                </p>
                <pre className="bg-muted p-2 rounded text-sm">
                  <code>cp .env.example .env && nano .env</code>
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Start Services</h3>
                <p className="text-muted-foreground">
                  Launch all services with Docker Compose and verify everything is running
                </p>
                <pre className="bg-muted p-2 rounded text-sm">
                  <code>docker-compose up -d && docker-compose ps</code>
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                4
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Test Your Setup</h3>
                <p className="text-muted-foreground">
                  Submit a test project and watch the AI agents work their magic
                </p>
                <pre className="bg-muted p-2 rounded text-sm">
                  <code>curl -X POST http://localhost:5678/webhook/new-project</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">95%+</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">48-72h</div>
                <div className="text-sm text-muted-foreground">Avg Delivery</div>
              </div>
              <div>
                <div className="text-2xl font-bold">$10-50</div>
                <div className="text-sm text-muted-foreground">Cost per Project</div>
              </div>
              <div>
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-sm text-muted-foreground">Operation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Technology Stack</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Next.js 15</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">LangGraph</Badge>
            <Badge variant="secondary">n8n</Badge>
            <Badge variant="secondary">Ollama</Badge>
            <Badge variant="secondary">PostgreSQL</Badge>
            <Badge variant="secondary">Redis</Badge>
            <Badge variant="secondary">Docker</Badge>
            <Badge variant="secondary">Claude API</Badge>
            <Badge variant="secondary">OpenAI</Badge>
            <Badge variant="secondary">WebSockets</Badge>
            <Badge variant="secondary">tRPC</Badge>
          </div>
        </div>

        {/* Support */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Get support from our community or documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="https://discord.gg/vitc">Join Discord</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="https://github.com/yourusername/vitc-platform/issues">
                  Report Issue
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs/troubleshooting">Troubleshooting</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DocumentationLayout>
  );
}