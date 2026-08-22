import {
  StateGraph,
  Annotation,
  START,
  END,
} from "@langchain/langgraph";

import { mistralAiModel, cohereAiModel, geminiAiModel } from "./models.ai.js";
import { searchWeb } from "./search.ai.js";
import z from "zod";

// =======================
// STATE ANNOTATION
// =======================

export const StateAnnotation = Annotation.Root({
  problem_statement: Annotation<string>,
  web_search_context: Annotation<string>,
  solution_1: Annotation<string>,
  solution_2: Annotation<string>,
  judge: Annotation<{
    solution_1_score: number;
    solution_2_score: number;
    solution_1_reasoning: string;
    solution_2_reasoning: string;
    comparative_verdict: string;
  }>,
});

// =======================
// JUDGE SCHEMA
// =======================

const JudgeEvaluationSchema = z.object({
  solution_1_score: z
    .number()
    .min(0)
    .max(10)
    .describe("Strict score from 0 to 10 for Solution 1 based on accuracy and depth"),
  solution_2_score: z
    .number()
    .min(0)
    .max(10)
    .describe("Strict score from 0 to 10 for Solution 2 based on accuracy and depth"),
  solution_1_reasoning: z
    .string()
    .describe("Detailed strengths, weaknesses, and edge cases for Solution 1."),
  solution_2_reasoning: z
    .string()
    .describe("Detailed strengths, weaknesses, and edge cases for Solution 2."),
  comparative_verdict: z
    .string()
    .describe("Compare both solutions and explain which one is better and why."),
});

// =======================
// SEARCH NODE
// =======================

const searchNode = async (state: typeof StateAnnotation.State) => {
  const webSearchContext = await searchWeb(state.problem_statement);
  return {
    web_search_context: webSearchContext || "",
  };
};

// =======================
// SOLUTION NODE
// =======================

const solutionNode = async (state: typeof StateAnnotation.State) => {
  const prompt = `
Answer the following problem statement clearly, accurately, and completely.

<problem_statement>
${state.problem_statement}
</problem_statement>

${
  state.web_search_context
    ? `
<web_search_context>
Latest ground-truth information gathered from the web:
${state.web_search_context}
</web_search_context>`
    : ""
}
`;

  const [mistralResponse, cohereResponse] = await Promise.all([
    mistralAiModel.invoke(prompt),
    cohereAiModel.invoke(prompt),
  ]);

  const solution1 =
    typeof mistralResponse.content === "string"
      ? mistralResponse.content
      : mistralResponse.text || "";

  const solution2 =
    typeof cohereResponse.content === "string"
      ? cohereResponse.content
      : cohereResponse.text || "";

  return {
    solution_1: solution1,
    solution_2: solution2,
  };
};

// =======================
// JUDGE NODE
// =======================

const judgeNode = async (state: typeof StateAnnotation.State) => {
  const structuredJudge = geminiAiModel.withStructuredOutput(JudgeEvaluationSchema);

  const prompt = `
You are an expert, unbiased AI Judge.
Evaluate both solutions independently based on accuracy, clarity, and depth.

Scoring Guide:
0-2 : Poor / Inaccurate
3-5 : Mediocre / Partially correct
6-8 : Good / Accurate & Clear
9-10 : Excellent / Comprehensive & Nuanced

Be strict and objective while scoring.

<problem_statement>
${state.problem_statement}
</problem_statement>

${
  state.web_search_context
    ? `
<web_search_context>
Ground truth gathered from the web. Cross-check both solutions against it:
${state.web_search_context}
</web_search_context>`
    : ""
}

<solution_1>
${state.solution_1}
</solution_1>

<solution_2>
${state.solution_2}
</solution_2>
`;

  const judgeResult = await structuredJudge.invoke(prompt);

  return {
    judge: judgeResult,
  };
};

// =======================
// GRAPH COMPILATION
// =======================

const graph = new StateGraph(StateAnnotation)
  .addNode("search", searchNode)
  .addNode("solution", solutionNode)
  .addNode("judgeME", judgeNode)

  .addEdge(START, "search")
  .addEdge("search", "solution")
  .addEdge("solution", "judgeME")
  .addEdge("judgeME", END)

  .compile();

// =======================
// RUN GRAPH
// =======================

export default async function runGraph(problem: string) {
  const result = await graph.invoke({
    problem_statement: problem,
    web_search_context: "",
    solution_1: "",
    solution_2: "",
    judge: {
      solution_1_score: 0,
      solution_2_score: 0,
      solution_1_reasoning: "",
      solution_2_reasoning: "",
      comparative_verdict: "",
    },
  });

  return result;
}
