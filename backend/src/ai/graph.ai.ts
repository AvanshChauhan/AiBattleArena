import {
  StateGraph,
  StateSchema,
  START,
  END,
  type GraphNode,
} from "@langchain/langgraph";

import { mistralAiModel, cohereAiModel, geminiAiModel } from "./models.ai.js";

import { createAgent, HumanMessage, toolStrategy } from "langchain";
import z from "zod";

// =======================
// STATE
// =======================

const state = new StateSchema({
  problem_statement: z.string().default(""),

  solution_1: z.string().default(""),

  solution_2: z.string().default(""),

  judge: z.object({
    solution_1_score: z.number().default(0),
    solution_2_score: z.number().default(0),

    solution_1_reasoning: z.string().default(""),
    solution_2_reasoning: z.string().default(""),

    comparative_verdict: z.string().default(""),
  }),
});

// =======================
// SOLUTION NODE
// =======================

const solutionNode: GraphNode<typeof state> = async (state) => {
  const [mistralResponse, cohereResponse] = await Promise.all([
    mistralAiModel.invoke(state.problem_statement),
    cohereAiModel.invoke(state.problem_statement),
  ]);

  return {
    solution_1: mistralResponse.text,
    solution_2: cohereResponse.text,
  };
};

// =======================
// JUDGE NODE
// =======================

const judgeNode: GraphNode<typeof state> = async (state) => {
  const judgeAgent = createAgent({
    model: geminiAiModel,

    responseFormat: toolStrategy(
      z.object({
        solution_1_score: z.number().min(0).max(10),

        solution_2_score: z.number().min(0).max(10),

        solution_1_reasoning: z
          .string()
          .describe(
            "Detailed strengths, weaknesses, and edge cases for Solution 1."
          ),

        solution_2_reasoning: z
          .string()
          .describe(
            "Detailed strengths, weaknesses, and edge cases for Solution 2."
          ),

        comparative_verdict: z
          .string()
          .describe(
            "Compare both solutions and explain which one is better and why."
          ),
      })
    ),

    systemPrompt: `
You are an expert and unbiased AI Judge.

Evaluate both solutions independently.

Scoring:

0-2 : Poor
3-5 : Mediocre
6-8 : Good
9-10 : Excellent

Be strict while scoring.
`,
  });

  const result = await judgeAgent.invoke({
    messages: [
      new HumanMessage(`
<problem_statement>
${state.problem_statement}
</problem_statement>

<solution_1>
${state.solution_1}
</solution_1>

<solution_2>
${state.solution_2}
</solution_2>
`),
    ],
  });

  return {
    judge: result.structuredResponse,
  };
};

// =======================
// GRAPH
// =======================

const graph = new StateGraph(state)
  .addNode("solution", solutionNode)
  .addNode("judgeME", judgeNode)

  .addEdge(START, "solution")
  .addEdge("solution", "judgeME")
  .addEdge("judgeME", END)

  .compile();

// =======================
// RUN GRAPH
// =======================

export default async function runGraph(problem: string) {
  const result = await graph.invoke({
    problem_statement: problem,
  });

  return result;
}
