"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IAIAgent } from "@/lib/database/models/AIAgent";
import { AgentStatus } from "@/types";
import { 
  Bot, 
  Star, 
  Clock, 
  Activity, 
  Settings, 
  Play, 
  Pause,
  MoreHorizontal 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: IAIAgent;
  onEdit?: (agent: IAIAgent) => void;
  onDelete?: (agent: IAIAgent) => void;
  onToggleStatus?: (agent: IAIAgent) => void;
}

const statusColors = {
  [AgentStatus.ACTIVE]: "bg-green-500",
  [AgentStatus.INACTIVE]: "bg-gray-500",
  [AgentStatus.TRAINING]: "bg-yellow-500",
  [AgentStatus.MAINTENANCE]: "bg-red-500",
};

const statusLabels = {
  [AgentStatus.ACTIVE]: "Active",
  [AgentStatus.INACTIVE]: "Inactive",
  [AgentStatus.TRAINING]: "Training",
  [AgentStatus.MAINTENANCE]: "Maintenance",
};

export function AgentCard({ agent, onEdit, onDelete, onToggleStatus }: AgentCardProps) {
  const isActive = agent.status === AgentStatus.ACTIVE;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback>
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {agent.type}
                </Badge>
                <div className="flex items-center space-x-1">
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full",
                      statusColors[agent.status]
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {statusLabels[agent.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(agent)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus?.(agent)}>
                {isActive ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(agent)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {agent.description}
        </p>

        {/* Skills */}
        <div>
          <h4 className="text-sm font-medium mb-2">Skills</h4>
          <div className="flex flex-wrap gap-1">
            {agent.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {agent.skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{agent.skills.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-sm">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="font-medium">
                {agent.performance.averageRating.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-sm">
              <Activity className="h-3 w-3 text-blue-500" />
              <span className="font-medium">
                {agent.performance.tasksCompleted}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-sm">
              <Clock className="h-3 w-3 text-green-500" />
              <span className="font-medium">
                {Math.round(agent.performance.responseTimeMs / 1000)}s
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Response</p>
          </div>
        </div>

        {/* Provider Info */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{agent.model.provider}</span> • {agent.model.model}
        </div>
      </CardContent>
    </Card>
  );
}