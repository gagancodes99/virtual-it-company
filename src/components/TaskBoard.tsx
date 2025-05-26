'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Filter,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Bot,
  Calendar,
  Tag,
  MoreVertical,
  FileCode,
  TestTube,
  Rocket,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: {
    id: string;
    name: string;
    type: 'human' | 'ai';
    avatar?: string;
  };
  project: {
    id: string;
    name: string;
  };
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
  color: string;
}

interface TaskBoardProps {
  projectId?: string;
  showAllProjects?: boolean;
}

const defaultColumns: Column[] = [
  { id: 'backlog', title: 'Backlog', taskIds: [], color: 'bg-gray-100' },
  { id: 'todo', title: 'To Do', taskIds: [], color: 'bg-blue-50' },
  { id: 'in_progress', title: 'In Progress', taskIds: [], color: 'bg-yellow-50' },
  { id: 'review', title: 'Review', taskIds: [], color: 'bg-purple-50' },
  { id: 'done', title: 'Done', taskIds: [], color: 'bg-green-50' },
];

export function TaskBoard({ projectId, showAllProjects = false }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    // In real implementation, fetch from API
    // For now, using mock data
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication with email/password',
        status: 'in_progress',
        priority: 'high',
        assignee: {
          id: 'agent-1',
          name: 'Developer Agent',
          type: 'ai',
        },
        project: {
          id: 'proj-1',
          name: 'E-commerce Platform',
        },
        tags: ['backend', 'security'],
        estimatedHours: 8,
        actualHours: 6,
        dueDate: new Date('2024-12-25'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Create product listing page',
        description: 'Design and implement the product grid with filters',
        status: 'todo',
        priority: 'medium',
        assignee: {
          id: 'agent-2',
          name: 'Frontend Agent',
          type: 'ai',
        },
        project: {
          id: 'proj-1',
          name: 'E-commerce Platform',
        },
        tags: ['frontend', 'ui'],
        estimatedHours: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        title: 'Write unit tests',
        description: 'Add comprehensive unit tests for authentication module',
        status: 'todo',
        priority: 'medium',
        assignee: {
          id: 'agent-3',
          name: 'Tester Agent',
          type: 'ai',
        },
        project: {
          id: 'proj-1',
          name: 'E-commerce Platform',
        },
        tags: ['testing', 'quality'],
        estimatedHours: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const tasksMap: Record<string, Task> = {};
    const newColumns = [...defaultColumns];

    mockTasks.forEach((task) => {
      tasksMap[task.id] = task;
      const columnIndex = newColumns.findIndex((col) => col.id === task.status);
      if (columnIndex !== -1) {
        newColumns[columnIndex].taskIds.push(task.id);
      }
    });

    setTasks(tasksMap);
    setColumns(newColumns);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newColumns = [...columns];
    const sourceColumn = newColumns.find((col) => col.id === source.droppableId)!;
    const destColumn = newColumns.find((col) => col.id === destination.droppableId)!;

    sourceColumn.taskIds.splice(source.index, 1);
    destColumn.taskIds.splice(destination.index, 0, draggableId);

    setColumns(newColumns);

    // Update task status
    const task = tasks[draggableId];
    const updatedTask = {
      ...task,
      status: destination.droppableId as Task['status'],
      updatedAt: new Date(),
    };
    setTasks({ ...tasks, [draggableId]: updatedTask });

    // In real implementation, update via API
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'Frontend Agent':
        return <FileCode className="h-4 w-4" />;
      case 'Developer Agent':
        return <FileCode className="h-4 w-4" />;
      case 'Tester Agent':
        return <TestTube className="h-4 w-4" />;
      case 'DevOps Agent':
        return <Rocket className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTasks = Object.values(tasks).filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || task.assignee.id === filterAssignee;
    const matchesProject = showAllProjects || !projectId || task.project.id === projectId;

    return matchesSearch && matchesPriority && matchesAssignee && matchesProject;
  });

  const filteredTaskIds = new Set(filteredTasks.map(t => t.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Task Board</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="agent-1">Developer Agent</SelectItem>
              <SelectItem value="agent-2">Frontend Agent</SelectItem>
              <SelectItem value="agent-3">Tester Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className={cn('rounded-t-lg p-3', column.color)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {column.taskIds.filter(id => filteredTaskIds.has(id)).length}
                  </Badge>
                </div>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-2 space-y-2 min-h-[200px] rounded-b-lg transition-colors',
                      column.color,
                      snapshot.isDraggingOver && 'bg-opacity-70'
                    )}
                  >
                    {column.taskIds
                      .filter(taskId => filteredTaskIds.has(taskId))
                      .map((taskId, index) => {
                        const task = tasks[taskId];
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'cursor-pointer hover:shadow-md transition-shadow',
                                  snapshot.isDragging && 'shadow-lg rotate-3'
                                )}
                                onClick={() => setSelectedTask(task)}
                              >
                                <CardContent className="p-3 space-y-2">
                                  {/* Priority indicator */}
                                  <div className="flex items-center justify-between">
                                    <div
                                      className={cn(
                                        'h-1 w-16 rounded-full',
                                        getPriorityColor(task.priority)
                                      )}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle task options
                                      }}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  {/* Task title */}
                                  <h4 className="font-medium text-sm line-clamp-2">
                                    {task.title}
                                  </h4>

                                  {/* Tags */}
                                  {task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags.map((tag) => (
                                        <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="text-xs px-1 py-0"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Assignee and due date */}
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      {task.assignee.type === 'ai' ? (
                                        getAgentIcon(task.assignee.name)
                                      ) : (
                                        <User className="h-3 w-3" />
                                      )}
                                      <span className="truncate max-w-[80px]">
                                        {task.assignee.name}
                                      </span>
                                    </div>
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Progress (if in progress) */}
                                  {task.status === 'in_progress' && task.estimatedHours && (
                                    <div className="space-y-1">
                                      <Progress
                                        value={(task.actualHours || 0) / task.estimatedHours * 100}
                                        className="h-1"
                                      />
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{task.actualHours || 0}h</span>
                                        <span>{task.estimatedHours}h</span>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
                <DialogDescription>{selectedTask.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge>{selectedTask.status.replace('_', ' ')}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <Badge variant="outline" className="capitalize">
                      {selectedTask.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {selectedTask.assignee.type === 'ai' ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            selectedTask.assignee.name[0]
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{selectedTask.assignee.name}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Project</p>
                    <p className="text-sm">{selectedTask.project.name}</p>
                  </div>
                </div>
                {selectedTask.dueDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                    <p className="text-sm">
                      {new Date(selectedTask.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedTask.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1">Edit Task</Button>
                  <Button variant="outline" className="flex-1">View Details</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}