import { api } from './client';

export type UserReport = {
  userId: string;
  username: string;
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  progressPercentage: number;
  topicsSummary: { topicId: string; topicName: string; goalsCount: number; completedCount: number; progressPercentage: number }[];
  progressOverTime: { date: string; totalProgress: number }[];
};

export type TopicReport = {
  topicId: string;
  topicName: string;
  totalGoals: number;
  completedGoals: number;
  progressPercentage: number;
  usersSummary: { userId: string; username: string; goalsCount: number; completedCount: number; progressPercentage: number }[];
};

export async function getUserReport(userId: string) {
  const res = await api.get(`/reports/user/${userId}`);
  return res.data.data as UserReport;
}

export async function getTopicReport(topicId: string) {
  const res = await api.get(`/reports/topic/${topicId}`);
  return res.data.data as TopicReport;
}
