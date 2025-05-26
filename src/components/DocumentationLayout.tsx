'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  Code,
  FileText,
  Home,
  Menu,
  Rocket,
  Settings,
  X,
  ChevronRight,
  Search,
  GitBranch,
  Layers,
  Zap,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface DocSection {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: {
    title: string;
    href: string;
  }[];
}

const docSections: DocSection[] = [
  {
    title: 'Getting Started',
    href: '/docs',
    icon: <Home className="h-4 w-4" />,
    children: [
      { title: 'Overview', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quick-start' },
      { title: 'Installation', href: '/docs/installation' },
    ],
  },
  {
    title: 'Architecture',
    href: '/docs/architecture',
    icon: <Layers className="h-4 w-4" />,
    children: [
      { title: 'System Design', href: '/docs/architecture' },
      { title: 'Components', href: '/docs/architecture/components' },
      { title: 'Data Flow', href: '/docs/architecture/data-flow' },
    ],
  },
  {
    title: 'Implementation',
    href: '/docs/implementation-guide',
    icon: <Code className="h-4 w-4" />,
    children: [
      { title: 'Setup Guide', href: '/docs/implementation-guide' },
      { title: 'AI Agents', href: '/docs/implementation-guide/agents' },
      { title: 'Workflows', href: '/docs/implementation-guide/workflows' },
    ],
  },
  {
    title: 'API Reference',
    href: '/docs/api-documentation',
    icon: <FileText className="h-4 w-4" />,
    children: [
      { title: 'REST API', href: '/docs/api-documentation' },
      { title: 'WebSockets', href: '/docs/api-documentation/websockets' },
      { title: 'Webhooks', href: '/docs/api-documentation/webhooks' },
    ],
  },
  {
    title: 'Deployment',
    href: '/docs/deployment',
    icon: <Rocket className="h-4 w-4" />,
    children: [
      { title: 'Local Setup', href: '/docs/deployment' },
      { title: 'Cloud Deploy', href: '/docs/deployment/cloud' },
      { title: 'Scaling', href: '/docs/deployment/scaling' },
    ],
  },
  {
    title: 'Advanced',
    href: '/docs/advanced',
    icon: <Zap className="h-4 w-4" />,
    children: [
      { title: 'Multi-LLM', href: '/docs/advanced/multi-llm' },
      { title: 'Optimization', href: '/docs/advanced/optimization' },
      { title: 'Security', href: '/docs/advanced/security' },
    ],
  },
];

interface DocumentationLayoutProps {
  children: React.ReactNode;
}

export function DocumentationLayout({ children }: DocumentationLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const NavContent = () => (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Documentation
        </h2>
        <div className="space-y-1">
          {docSections.map((section) => (
            <div key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                  pathname === section.href ? 'bg-accent' : 'transparent'
                )}
              >
                {section.icon}
                <span className="ml-3">{section.title}</span>
              </Link>
              {section.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {section.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                        pathname === child.href
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <ChevronRight className="mr-2 h-3 w-3" />
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Resources
        </h2>
        <div className="space-y-1">
          <a
            href="https://github.com/yourusername/virtual-it-company-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <GitBranch className="h-4 w-4" />
            <span className="ml-3">GitHub</span>
          </a>
          <Link
            href="/docs/api-documentation"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Shield className="h-4 w-4" />
            <span className="ml-3">API Keys</span>
          </Link>
          <Link
            href="/docs/deployment/troubleshooting"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="ml-3">Troubleshooting</span>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed left-4 top-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b px-6">
            <Book className="mr-2 h-6 w-6" />
            <span className="text-lg font-semibold">VITC Docs</span>
          </div>
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-background border-r">
        <div className="flex h-16 items-center border-b px-6">
          <Book className="mr-2 h-6 w-6" />
          <span className="text-lg font-semibold">VITC Docs</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Documentation</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}