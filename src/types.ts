export enum Curriculum {
  IGCSE = 'IGCSE',
  IBMYP = 'IBMYP',
  IBDP = 'IBDP'
}

export interface SyllabusData {
  subjects: string[] | Record<string, string[]>;
  years: string[];
  units: Record<string, string[]>;
}

export interface YouTubeLink {
  title: string;
  url: string;
  channel: string;
}

export interface FreyerModel {
  definition: string;
  characteristics: string;
  examples: string;
  nonExamples: string;
}

export interface TechToolInfo {
  name: string;
  url: string;
  description: string;
}

export interface TechnologyTools {
  mentimeter: TechToolInfo;
  quizizz: TechToolInfo;
  blooket: TechToolInfo;
  padlet: TechToolInfo;
  simulations: TechToolInfo;
}

export interface SOIAndEnquiry {
  soi: string;
  keyQuestion: string;
  relatedConcepts: string;
  globalContext: string;
}

export interface LessonPlan {
  lessonNumber: number;
  topic: string;
  duration: number;
  starter: string;
  customAppLink?: {
    name: string;
    url: string;
  };
  slideDeckUrl?: string;
  notebookLMUrl?: string;
  learningObjectives: string[];
  senSupport: string;
  learningOutcomes: string[];
  differentiationCAT4: {
    verbal: string;
    quantitative: string;
    nonVerbal: string;
    spatial: string;
    tieredTasks: string;
    choiceBoard: string;
    scaffoldToStretch: string;
    openEndedInquiry: string;
  };
  conceptualFocus: string;
  exitSlip: string;
  homeAssignment: string;
  worksheet: string;
  youtubeLinks: YouTubeLink[];
  freyerModel: FreyerModel;
  technologyTools: TechnologyTools;
  slides: string;
  aiAssistedTask: string;
  studentNotes: string[];
  // IBMYP specific fields
  contextAndContent?: string;
  englishEnrichment?: string;
  soiAndEnquiry?: SOIAndEnquiry;
  ATLSkills?: string[];
  assessmentCriteria?: string;
}

export interface Channel {
  name: string;
  handle: string;
  checked: boolean;
}
