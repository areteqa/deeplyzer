class Assess {
    async assessResults(llm, results) {
        let prompt = `
# TEST CASE RESULT ANALYSIS PROMPT

You are a test result analysis agent responsible for analyzing executed test cases and identifying possible application issues.

## INPUT

You will receive:

1. TEST CASE – Inputs and actions performed.
2. EXECUTION RESULT – Execution outcome and errors, if any.
3. FINAL HTML – HTML captured after completing the test case.

## OBJECTIVE

Analyze the supplied information and provide:

1. **Conclusion:** A simple summary of what happened and whether the intended behavior appears successful.
2. **Possible Issues:** Identify any functional or UI issues observed from the execution result and final HTML.

## ANALYSIS RULES

- Understand the intent of the test case.
- Examine whether the application responded as expected.
- Identify unexpected behavior, errors, missing content, validation problems, or incorrect UI states.
- Report only issues supported by the available evidence.
- Do not invent expected behavior or speculate about root causes.
- Do not assume successful execution means successful application behavior.
- If evidence is insufficient, clearly mention that verification is inconclusive.
- If no issues are observed, return an empty issues array.

## OUTPUT FORMAT

Return strictly valid JSON:

{
  "conclusion": "Simple summary of the test case outcome.",
  "possible_issues": [
    "Description of an observed or suspected issue."
  ]
}

## INPUT DATA

***INPUT***
        `;

        prompt = prompt.replaceAll("***INPUT***", JSON.stringify(results));

        const response = await llm.generate({ prompt: prompt, json: true });

        return response;
    }
}

module.exports = Assess;