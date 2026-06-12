import { useState } from 'react';
import { AppState, Project, Task, Employee } from '../types';

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  }
];

const initialProjects: Project[] = [
  {
    id: '1',
    name: 'E-Commerce Platform',
    description: 'Building a modern e-commerce platform',
    key: 'ECP',
    createdAt: new Date('2024-01-15'),
    assignedEmployees: mockEmployees
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Cross-platform mobile application',
    key: 'MAD',
    createdAt: new Date('2024-02-01'),
    assignedEmployees: [mockEmployees[0], mockEmployees[1]]
  }
];

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure user authentication',
    type: 'epic',
    status: 'inprogress',
    priority: 'high',
    projectId: '1',
    assignedTo: mockEmployees[0],
    createdAt: new Date('2024-01-16'),
    isStarred: true,
    storyPoints: 13
  },
  {
    id: '2',
    title: 'Login Page Design',
    description: 'Create responsive login page',
    type: 'story',
    status: 'done',
    priority: 'medium',
    projectId: '1',
    parentId: '1',
    assignedTo: mockEmployees[1],
    createdAt: new Date('2024-01-17'),
    isStarred: false,
    storyPoints: 5
  },
  {
    id: '3',
    title: 'Password Validation',
    description: 'Implement strong password validation',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    projectId: '1',
    parentId: '2',
    assignedTo: mockEmployees[2],
    createdAt: new Date('2024-01-18'),
    isStarred: false,
    storyPoints: 3
  }
];

export const useProjectManager = () => {
  const [state, setState] = useState<AppState>({
    projects: initialProjects,
    tasks: initialTasks,
    employees: mockEmployees,
    selectedProjectId: '1',
    selectedTab: 'summary',
    sidebarCollapsed: false
  });

  const createProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject]
    }));
  };

  const createTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, status } : task
      )
    }));
  };

  const toggleTaskStar = (taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, isStarred: !task.isStarred } : task
      )
    }));
  };

  const selectProject = (projectId: string | null) => {
    setState(prev => ({ ...prev, selectedProjectId: projectId }));
  };

  const setSelectedTab = (tab: AppState['selectedTab']) => {
    setState(prev => ({ ...prev, selectedTab: tab }));
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  return {
    state,
    createProject,
    createTask,
    updateTaskStatus,
    toggleTaskStar,
    selectProject,
    setSelectedTab,
    toggleSidebar
  };
};