import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, Curriculum } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateLessonPlans(
  curriculum: Curriculum,
  subject: string,
  year: string,
  unit: string,
  topic: string,
  count: number,
  channels: string
): Promise<LessonPlan[]> {
  const isMYP = curriculum === Curriculum.IBMYP;
  
  // Determine lesson duration
  let duration = 40;
  if (curriculum === Curriculum.IGCSE) {
    if (year.includes('9') || year.includes('10') || year.includes('11')) {
      duration = 55;
    }
  } else if (curriculum === Curriculum.IBMYP) {
    if (year.includes('4') || year.includes('5')) {
      duration = 55;
    }
  }

  const prompt = `Generate ${count} comprehensive lesson plans for a teacher studio.
Curriculum: ${curriculum}
Subject: ${subject}
Year/Grade: ${year}
Unit: ${unit}
Topic: ${topic}
Target Lesson Duration: ${duration} minutes

YouTube Channels to prioritize for video links: ${channels}

Strict Guidelines:
1. Provide a logical sequence across the ${count} lessons.
2. Every lesson MUST begin with an "Interesting Starter" that hooks the students immediately. The rest of the lesson plan MUST build directly on this starter.
3. Differentiation: Design differentiation informed by CAT4 profiles (verbal, quantitative, non-verbal, spatial) by grouping students based on readiness and learning preferences. Implement differentiation through:
   - tiered tasks with increasing cognitive complexity,
   - a choice board offering multiple modes of demonstrating the same learning objective,
   - a scaffold-to-stretch pathway (guided → independent → extension), and
   - an open-ended inquiry question allowing multiple entry points and depth.
   Ensure all tasks align to the same learning objective, maintain academic rigor, and include brief examples.
4. Include a "Conceptual Focus" section explaining how students are learning content through macro and micro concepts.
5. Technology Stack (MANDATORY): 
   - Mentimeter, Quizizz, Blooket, Padlet, and relevant Simulations.
   For each, provide a specific description of HOW teaching happens using this tool for this specific topic.
6. Use Freyer Model for key vocabulary support.
7. Slides: Provide a detailed "slides" structure and include a functional-looking "slideDeckUrl".
8. AI-Assisted Learner Task (MANDATORY): Provide a specific, actionable task where students use AI (like Gemini or ChatGPT) as a learning partner to deepen their understanding of this specific topic.
9. For IBMYP, include SOI, Key Questions, Related Concepts, and Global Context.
10. ATL Skills (MANDATORY for IBMYP): Identify 2-3 relevant ATL skills. For EACH skill, provide 1-2 specific sentences explaining how it is implemented or practiced during this particular lesson's activities.
11. Student Notes (MANDATORY): Provide exactly 10 short, clear, and important summary sentences about the topic that students can write down in their notebooks.
12. DO NOT include any specific dates.

Response must be a valid JSON array of LessonPlan objects.`;

  const lessonSchema = {
    type: Type.OBJECT,
    properties: {
      lessonNumber: { type: Type.INTEGER },
      topic: { type: Type.STRING },
      duration: { type: Type.INTEGER },
      starter: { type: Type.STRING },
      studentNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
      customAppLink: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ['name', 'url']
      },
      learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      conceptualFocus: { type: Type.STRING },
      senSupport: { type: Type.STRING },
      learningOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
      differentiationCAT4: {
        type: Type.OBJECT,
        properties: {
          verbal: { type: Type.STRING },
          quantitative: { type: Type.STRING },
          nonVerbal: { type: Type.STRING },
          spatial: { type: Type.STRING },
          tieredTasks: { type: Type.STRING },
          choiceBoard: { type: Type.STRING },
          scaffoldToStretch: { type: Type.STRING },
          openEndedInquiry: { type: Type.STRING }
        },
        required: ['verbal', 'quantitative', 'nonVerbal', 'spatial', 'tieredTasks', 'choiceBoard', 'scaffoldToStretch', 'openEndedInquiry']
      },
      exitSlip: { type: Type.STRING },
      homeAssignment: { type: Type.STRING },
      worksheet: { type: Type.STRING },
      youtubeLinks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            channel: { type: Type.STRING }
          },
          required: ['title', 'url', 'channel']
        }
      },
      freyerModel: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          characteristics: { type: Type.STRING },
          examples: { type: Type.STRING },
          nonExamples: { type: Type.STRING }
        },
        required: ['definition', 'characteristics', 'examples', 'nonExamples']
      },
      technologyTools: {
        type: Type.OBJECT,
        properties: {
          mentimeter: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          quizizz: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          blooket: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          padlet: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          simulations: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          }
        },
        required: ['mentimeter', 'quizizz', 'blooket', 'padlet', 'simulations']
      },
      slides: { type: Type.STRING },
      slideDeckUrl: { type: Type.STRING },
      aiAssistedTask: { type: Type.STRING },
      ...(isMYP ? {
        contextAndContent: { type: Type.STRING },
        englishEnrichment: { type: Type.STRING },
        soiAndEnquiry: {
          type: Type.OBJECT,
          properties: {
            soi: { type: Type.STRING },
            keyQuestion: { type: Type.STRING },
            relatedConcepts: { type: Type.STRING },
            globalContext: { type: Type.STRING }
          },
          required: ['soi', 'keyQuestion', 'relatedConcepts', 'globalContext']
        },
        ATLSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        assessmentCriteria: { type: Type.STRING }
      } : {})
    },
    required: [
      'lessonNumber', 'topic', 'learningObjectives', 'starter', 'conceptualFocus', 'senSupport', 'learningOutcomes', 
      'differentiationCAT4', 'exitSlip', 'homeAssignment', 'worksheet', 
      'youtubeLinks', 'freyerModel', 'technologyTools', 'slides', 'slideDeckUrl', 'aiAssistedTask', 'studentNotes',
      ...(isMYP ? ['ATLSkills', 'soiAndEnquiry'] : [])
    ]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lessons: {
            type: Type.ARRAY,
            items: lessonSchema
          }
        },
        required: ['lessons']
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.lessons;
}

export async function generateSingleStarter(
  curriculum: string,
  subject: string,
  year: string,
  topic: string,
  learningObjectives: string[]
): Promise<string> {
  const prompt = `Generate an "Interesting Starter" that hooks students immediately for the following lesson:
Curriculum: ${curriculum}
Subject: ${subject}
Year: ${year}
Topic: ${topic}
Learning Objectives: ${learningObjectives.join(', ')}

The starter must be engaging, relevant, and take about 5-10 minutes.
Return ONLY the text of the starter.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text.trim();
}

async function fileToPart(file: File) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve({
        inlineData: {
          data: base64.split(',')[1],
          mimeType: file.type
        }
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function generateBulkLessonPlans(
  curriculum: Curriculum,
  subject: string,
  year: string,
  unit: string,
  topics: string[],
  totalCount: number,
  channels: string,
  sourceFiles?: File[]
): Promise<LessonPlan[]> {
  const isMYP = curriculum === Curriculum.IBMYP;
  
  // Determine lesson duration
  let duration = 40;
  if (curriculum === Curriculum.IGCSE) {
    if (year.includes('9') || year.includes('10') || year.includes('11')) {
      duration = 55;
    }
  } else if (curriculum === Curriculum.IBMYP) {
    if (year.includes('4') || year.includes('5')) {
      duration = 55;
    }
  }

  const fileParts: any[] = sourceFiles ? await Promise.all(sourceFiles.map(fileToPart)) : [];

  // Basic check for total data size to avoid token limit errors
  // 1M tokens is roughly 3-4MB of raw text, but for PDFs/Docs it can vary.
  // We'll limit to ~20MB total of source material to be safe.
  const totalSize = sourceFiles?.reduce((acc, f) => acc + f.size, 0) || 0;
  if (totalSize > 100 * 1024 * 1024) {
    throw new Error("TOTAL_SIZE_EXCEEDED: Total source material size exceeds 100MB. Please upload fewer or smaller textbook sections to stay within AI limits.");
  }

  const prompt = `Generate exactly ${totalCount} comprehensive lesson plans for a teacher studio across the following sub-topics:
[${topics.join(', ')}]

Curriculum: ${curriculum}
Subject: ${subject}
Year/Grade: ${year}
Unit: ${unit}
Target Lesson Duration: ${duration} minutes

${sourceFiles && sourceFiles.length > 0 ? `SOURCE MATERIAL ATTACHED: Use the attached textbook/materials to extract specific definitions, examples, and key concepts. Scientific accuracy should be based on these materials.` : ''}

Strategic Distribution:
- You MUST distribute the ${totalCount} lessons across the ${topics.length} sub-topics.
- Some topics might require 2 lessons (if complex), others 1 lesson. 
- Ensure a logical flow from topic to topic.

YouTube Channels to prioritize for video links: ${channels}

Strict Guidelines:
1. Provide a logical sequence across all ${totalCount} lessons.
2. Every lesson MUST begin with an "Interesting Starter" that hooks the students immediately. The rest of the lesson plan MUST build directly on this starter.
3. Differentiation: Design differentiation informed by CAT4 profiles (verbal, quantitative, non-verbal, spatial) by grouping students based on readiness and learning preferences. Implement differentiation through:
   - tiered tasks with increasing cognitive complexity,
   - a choice board offering multiple modes of demonstrating the same learning objective,
   - a scaffold-to-stretch pathway (guided → independent → extension), and
   - an open-ended inquiry question allowing multiple entry points and depth.
   Ensure all tasks align to the same learning objective, maintain academic rigor, and include brief examples.
4. Include a "Conceptual Focus" section explaining how students are learning content through macro and micro concepts.
5. Technology Stack (MANDATORY): 
   - Mentimeter, Quizizz, Blooket, Padlet, and relevant Simulations.
   For each, provide a specific description of HOW teaching happens using this tool for this specific topic.
6. Use Freyer Model for key vocabulary support.
7. Slides: Provide a detailed "slides" structure and include a functional-looking "slideDeckUrl".
8. AI-Assisted Learner Task (MANDATORY): Provide a specific, actionable task where students use AI (like Gemini or ChatGPT) as a learning partner to deepen their understanding of this specific topic.
9. For IBMYP, include SOI, Key Questions, Related Concepts, and Global Context.
10. ATL Skills (MANDATORY for IBMYP): Identify 2-3 relevant ATL skills. For EACH skill, provide 1-2 specific sentences explaining how it is implemented or practiced during this particular lesson's activities.
11. Student Notes (MANDATORY): Provide exactly 10 short, clear, and important summary sentences about the topic that students can write down in their notebooks. Use the attached source material if provided to make these notes more accurate.
12. DO NOT include any specific dates.

Response must be a valid JSON array of LessonPlan objects.`;

  const lessonSchema = {
    type: Type.OBJECT,
    properties: {
      lessonNumber: { type: Type.INTEGER },
      topic: { type: Type.STRING },
      duration: { type: Type.INTEGER },
      starter: { type: Type.STRING },
      studentNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
      customAppLink: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ['name', 'url']
      },
      learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      conceptualFocus: { type: Type.STRING },
      senSupport: { type: Type.STRING },
      learningOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
      differentiationCAT4: {
        type: Type.OBJECT,
        properties: {
          verbal: { type: Type.STRING },
          quantitative: { type: Type.STRING },
          nonVerbal: { type: Type.STRING },
          spatial: { type: Type.STRING },
          tieredTasks: { type: Type.STRING },
          choiceBoard: { type: Type.STRING },
          scaffoldToStretch: { type: Type.STRING },
          openEndedInquiry: { type: Type.STRING }
        },
        required: ['verbal', 'quantitative', 'nonVerbal', 'spatial', 'tieredTasks', 'choiceBoard', 'scaffoldToStretch', 'openEndedInquiry']
      },
      exitSlip: { type: Type.STRING },
      homeAssignment: { type: Type.STRING },
      worksheet: { type: Type.STRING },
      youtubeLinks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            channel: { type: Type.STRING }
          },
          required: ['title', 'url', 'channel']
        }
      },
      freyerModel: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          characteristics: { type: Type.STRING },
          examples: { type: Type.STRING },
          nonExamples: { type: Type.STRING }
        },
        required: ['definition', 'characteristics', 'examples', 'nonExamples']
      },
      technologyTools: {
        type: Type.OBJECT,
        properties: {
          mentimeter: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          quizizz: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          blooket: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          padlet: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          },
          simulations: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'url', 'description']
          }
        },
        required: ['mentimeter', 'quizizz', 'blooket', 'padlet', 'simulations']
      },
      slides: { type: Type.STRING },
      slideDeckUrl: { type: Type.STRING },
      aiAssistedTask: { type: Type.STRING },
      ...(isMYP ? {
        contextAndContent: { type: Type.STRING },
        englishEnrichment: { type: Type.STRING },
        soiAndEnquiry: {
          type: Type.OBJECT,
          properties: {
            soi: { type: Type.STRING },
            keyQuestion: { type: Type.STRING },
            relatedConcepts: { type: Type.STRING },
            globalContext: { type: Type.STRING }
          },
          required: ['soi', 'keyQuestion', 'relatedConcepts', 'globalContext']
        },
        ATLSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        assessmentCriteria: { type: Type.STRING }
      } : {})
    },
    required: [
      'lessonNumber', 'topic', 'learningObjectives', 'starter', 'conceptualFocus', 'senSupport', 'learningOutcomes', 
      'differentiationCAT4', 'exitSlip', 'homeAssignment', 'worksheet', 
      'youtubeLinks', 'freyerModel', 'technologyTools', 'slides', 'slideDeckUrl', 'aiAssistedTask', 'studentNotes',
      ...(isMYP ? ['ATLSkills', 'soiAndEnquiry'] : [])
    ]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          ...fileParts,
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lessons: {
            type: Type.ARRAY,
            items: lessonSchema
          }
        },
        required: ['lessons']
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.lessons;
}

