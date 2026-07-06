export const Role = {
  ADMIN: "ADMIN",
  STUDENT: "STUDENT",
  GUEST: "GUEST"
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED"
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export type MockUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  gradeLevel?: string;
  gender?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CareerProfile = {
  id: string;
  userId: string;
  gradeLevel: string;
  gender?: string | null;
  interests: string[];
  strengths: string[];
  favoriteSubjects: string[];
  values: string[];
  riasec: string[];
  goals: string;
  constraints: string;
  assessmentCompleted: boolean;
  assessmentAnswers: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
};

export type CareerPath = {
  id: string;
  title: string;
  cluster: string;
  summary: string;
  subjects: string[];
  jobSkills: string[];
  majors: string[];
  activities: string[];
  jobTasks: string[];
  onetCode?: string | null;
  featureVector?: number[] | null;
  featureVectorVersion?: string | null;
  featureVectorUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CareerMatch = CareerPath & {
  score: number;
  reasons: string[];
};

export type AssessmentQuestion = {
  id: string;
  step: "subjects" | "interests" | "skills" | "values";
  prompt: string;
  weights: {
    favoriteSubjects?: string[];
    interests?: string[];
    strengths?: string[];
    values?: string[];
    riasec?: string[];
  };
};
