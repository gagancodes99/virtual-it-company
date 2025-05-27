'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileText, 
  Code, 
  Layers, 
  GitBranch,
  Rocket,
  Calendar,
  Users,
  Settings,
  Database,
  Cloud,
  Shield,
  Zap
} from 'lucide-react';

interface NavigationItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  children?: NavigationItem[];
}

interface DocNavigationProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: <FileText className="h-4 w-4" />,
    badge: 'Start Here',
    badgeVariant: 'default'
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: <Layers className="h-4 w-4" />,
    children: [
      { id: 'system-design', title: 'System Design', icon: <Code className="h-4 w-4" /> },
      { id: 'ai-agents', title: 'AI Agents', icon: <Users className="h-4 w-4" /> },
      { id: 'workflow-engine', title: 'Workflow Engine', icon: <GitBranch className="h-4 w-4" /> }
    ]
  },
  {
    id: 'implementation',
    title: 'Implementation',
    icon: <Code className="h-4 w-4" />,
    badge: 'In Progress',
    badgeVariant: 'secondary',
    children: [
      { id: 'immediate-actions', title: 'Weeks 1-2', icon: <Zap className="h-4 w-4" /> },
      { id: 'sprint-1', title: 'Weeks 3-4', icon: <Calendar className="h-4 w-4" /> },
      { id: 'sprint-2', title: 'Weeks 5-6', icon: <Calendar className="h-4 w-4" /> },
      { id: 'long-term', title: 'Month 2+', icon: <Rocket className="h-4 w-4" /> }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: <Cloud className="h-4 w-4" />,
    children: [
      { id: 'github', title: 'GitHub', icon: <GitBranch className="h-4 w-4" /> },
      { id: 'aws', title: 'AWS', icon: <Cloud className="h-4 w-4" /> },
      { id: 'stripe', title: 'Stripe', icon: <Settings className="h-4 w-4" /> }
    ]
  },
  {
    id: 'deployment',
    title: 'Deployment',
    icon: <Rocket className="h-4 w-4" />,
    children: [
      { id: 'infrastructure', title: 'Infrastructure', icon: <Database className="h-4 w-4" /> },
      { id: 'security', title: 'Security', icon: <Shield className="h-4 w-4" /> },
      { id: 'monitoring', title: 'Monitoring', icon: <Settings className="h-4 w-4" /> }
    ]
  }
];

export default function DocNavigation({ selectedSection, onSectionChange }: DocNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['implementation']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filterNavItems = (items: NavigationItem[], query: string): NavigationItem[] => {
    if (!query) return items;
    
    return items.filter(item => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = item.children?.some(child =>
        child.title.toLowerCase().includes(query.toLowerCase())
      );
      
      return matchesQuery || hasMatchingChildren;
    });
  };

  const filteredItems = filterNavItems(navigationItems, searchQuery);

  return (
    <Card className="p-4 sticky top-4">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full h-9 text-sm"
          />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {filteredItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.children) {
                    toggleSection(item.id);
                  } else {
                    onSectionChange(item.id);
                  }
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm
                  transition-colors duration-200
                  ${selectedSection === item.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.badge && (
                    <Badge variant={item.badgeVariant} className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.children && (
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        expandedSections.includes(item.id) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              </button>

              {/* Children */}
              {item.children && expandedSections.includes(item.id) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onSectionChange(child.id)}
                      className={`
                        w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                        transition-colors duration-200
                        ${selectedSection === child.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      {child.icon}
                      <span>{child.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Quick Links */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Quick Links
          </h3>
          <div className="space-y-1">
            <a
              href="#"
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <GitBranch className="h-3 w-3" />
              <span>GitHub Repository</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Zap className="h-3 w-3" />
              <span>API Reference</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Shield className="h-3 w-3" />
              <span>Security Guide</span>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}