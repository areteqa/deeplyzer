class Generate {
    async generateTestCases(llm, html) {
        let prompt = `
# HTML INTERACTION INPUT GENERATION PROMPT

You are a web UI interaction analysis agent responsible for analyzing supplied HTML and generating an ordered sequence of executable test inputs and actions.

## 1. INPUT

You will receive HTML representing a web page or a portion of its DOM.

Analyze the supplied HTML to identify interactive elements, understand their purposes, and determine suitable interactions.

## 2. OBJECTIVE

Generate an ordered sequence of interaction steps that can be executed against the supplied HTML.

Each step represents one logical interaction and must contain:

- 'inputs': Elements that require values to be entered or selected before performing the action.
- 'action': An interaction to perform after setting the inputs.

Generate multiple steps when the page contains multiple independent interactions or sequential workflows.

Each subsequent step must represent the next logical interaction in the execution sequence.

A step may contain multiple related inputs but must have only one action at most.

## 3. INPUT IDENTIFICATION

Identify interactive input elements, including:

- Text inputs
- Email inputs
- Password inputs
- Number inputs
- Search inputs
- Textareas
- Select elements
- Radio buttons
- Checkboxes

For each identified input:

1. Determine its purpose using its attributes, labels, placeholders, names, IDs, and surrounding HTML.
2. Generate a suitable, valid test value.
3. Use the element's XPath as its identifier.
4. Avoid generating values that contradict the element's constraints or expected purpose.
5. Generate values that are appropriate for the intended interaction.

Examples:

| Element | Example value |
|---|---|
| Text | John Doe |
| Email | test@example.com |
| Password | Test@12345 |
| Number | 25 |
| Search | Example search |
| Checkbox | true |
| Radio | Corresponding option value |
| Select | Existing option value |
| Textarea | Relevant sample text |

Do not generate input values for elements that are not intended to accept user input.

## 4. ACTION IDENTIFICATION

Identify actionable elements such as:

- Buttons
- Submit controls
- Links
- Elements with click handlers
- Interactive controls with identifiable actions

Determine the most appropriate action from the available HTML.

Supported actions:

- 'click'

Use the element's XPath as its identifier.

Do not generate actions for decorative elements or elements without an identifiable interaction purpose.

## 5. STEP GENERATION

Generate an ordered sequence of interaction steps.

Rules:

1. Each step must contain an 'inputs' array and an 'action' object or null.
2. Group related inputs belonging to the same form or interaction into one step.
3. Set all relevant input values before executing their associated action.
4. Use a separate step for each independent action or subsequent interaction.
5. Preserve the logical execution order of interactions.
6. Do not combine unrelated actions into a single step.
7. Do not generate duplicate interactions without a clear reason.
8. Do not assume that an interaction succeeded merely because the HTML suggests it should.
9. Do not invent elements, attributes, options, or actions.
10. Generate only interactions supported by the supplied HTML.
11. Do not generate unnecessary steps for elements that do not contribute to an identifiable interaction.
12. If an action does not require any input values, generate the step with an empty 'inputs' array.
13. If no suitable interaction exists, return an empty array.

## 6. OUTPUT FORMAT

Return strictly valid JSON.

The root must be an array containing sequential interaction steps.

Each step must follow this structure:

{
"steps": [
  {
    "inputs": [
      {
        "element": "<xpath>",
        "value": "<string value>"
      },
      {
        "element": "<xpath>",
        "value": "<string value>"
      }
    ],
    "action": {
      "element": "<xpath>",
      "action": "click"
    }
  },
  {
    "inputs": [],
    "action": {
      "element": "<xpath>",
      "action": "click"
    }
  }
]
}

Output rules:

- The root must always be an array.
- Each array element represents one sequential interaction step.
- 'inputs' must always be an array.
- 'action' must be an object or null.
- Each step must contain exactly one action at most.
- Each input must contain only 'element' and 'value'.
- Each action must contain only 'element' and 'action'.
- 'element' must contain a valid XPath expression.
- All input values must be strings.
- Do not include explanations, markdown, comments, or additional properties.
- If no suitable interaction exists, return '[]'.

## 7. HTML

***HTML***

Analyze the supplied HTML and generate the interaction steps following all the instructions above.
        `;

        prompt = prompt.replaceAll("***HTML***", html);

        const response = await llm.generate({ prompt: prompt, json: true });

        return response;
    }
}

module.exports = Generate;