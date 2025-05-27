'use client';

import { useState, useEffect } from 'react';
import DocNavigation from '@/components/docs/DocNavigation';
import ProjectProgress from '@/components/docs/ProjectProgress';
import TaskStatus from '@/components/docs/TaskStatus';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Book, Target, Clock, CheckCircle2 } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  progress: number;
  tasks: number;
  completedTasks: number;
}

const documentationSections: DocSection[] = [
  {
    id: 'architecture',
    title: 'System Architecture',
    description: 'Multi-agent AI system with autonomous workflow orchestration',
    status: 'completed',
    progress: 100,
    tasks: 15,
    completedTasks: 15
  },
  {
    id: 'immediate-actions',
    title: 'Immediate Actions (Weeks 1-2)',
    description: 'Core AI infrastructure and LLM integration setup',
    status: 'in-progress',
    progress: 25,
    tasks: 13,
    completedTasks: 3
  },
  {
    id: 'sprint-1',
    title: 'Sprint 1 (Weeks 3-4)',
    description: 'Workflow engine and agent system implementation',
    status: 'pending',
    progress: 0,
    tasks: 11,
    completedTasks: 0
  },
  {
    id: 'sprint-2',
    title: 'Sprint 2 (Weeks 5-6)',
    description: 'External integrations and real-time features',
    status: 'pending',
    progress: 0,
    tasks: 10,
    completedTasks: 0
  },
  {
    id: 'long-term',
    title: 'Long Term (Month 2+)',
    description: 'Advanced features, scaling, and enterprise capabilities',
    status: 'pending',
    progress: 0,
    tasks: 11,
    completedTasks: 0
  }
];

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('overview');
  const [filteredSections, setFilteredSections] = useState(documentationSections);

  useEffect(() => {
    if (searchQuery) {
      const filtered = documentationSections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSections(filtered);
    } else {
      setFilteredSections(documentationSections);
    }
  }, [searchQuery]);

  const totalTasks = documentationSections.reduce((sum, section) => sum + section.tasks, 0);
  const completedTasks = documentationSections.reduce((sum, section) => sum + section.completedTasks, 0);
  const overallProgress = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Book className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Platform Documentation
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                8 Week Timeline
              </Badge>
              <Badge className="bg-indigo-600 text-white px-3 py-1">
                {overallProgress}% Complete
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Navigation */}
          <div className="lg:col-span-1">
            <DocNavigation
              selectedSection={selectedSection}
              onSectionChange={setSelectedSection}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Search Bar */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </Card>

            {/* Overall Progress */}
            <ProjectProgress
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              progress={overallProgress}
            />

            {/* Documentation Sections */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Target className="h-5 w-5 mr-2 text-indigo-600" />
                Implementation Roadmap
              </h2>
              
              <div className="grid gap-4">
                {filteredSections.map((section) => (
                  <Card
                    key={section.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-600"
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {section.title}
                          </h3>
                          <Badge
                            variant={
                              section.status === 'completed' ? 'default' :
                              section.status === 'in-progress' ? 'secondary' :
                              'outline'
                            }
                          >
                            {section.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          {section.description}
                        </p>
                        <TaskStatus
                          tasks={section.tasks}
                          completedTasks={section.completedTasks}
                          progress={section.progress}
                        />
                      </div>
                      {section.status === 'completed' && (
                        <CheckCircle2 className="h-6 w-6 text-green-500 ml-4 flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Hours</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">596</p>
                  </div>
                  <Clock className="h-8 w-8 text-indigo-600/20" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Completed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600/20" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Remaining</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalTasks - completedTasks}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600/20" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}