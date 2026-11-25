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
6. Respect HTML validation constraints such as required, min, max, maxlength, minlength, and pattern.
7. For select elements, use an existing enabled option value.
8. For radio buttons, use the actual value attribute of the selected option.
9. Do not generate values for disabled or readonly inputs.
10. Do not generate values for hidden inputs unless they are explicitly intended for user interaction.

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

Additional rules:

- For checkboxes, use "true" or "false" depending on the intended test scenario.
- For radio buttons, select one appropriate option from the existing radio group. Do not generate entries for every radio option.
- Do not invent values or options that are not supported by the supplied HTML.

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

Do not generate actions for decorative elements, disabled elements, or elements without an identifiable interaction purpose.

For form submissions, identify the appropriate submit button associated with the form. Do not confuse submit, reset, cancel, and other button purposes.

## 5. XPATH IDENTIFICATION

Use the element's XPath as its identifier for both inputs and actions.

Follow these rules:

1. Generate valid XPath expressions that identify actual elements in the supplied HTML.
2. Prefer unique IDs when available.
3. Otherwise, use relevant attributes such as name, type, value, and other identifying attributes.
4. Use positional XPath only when necessary.
5. Ensure XPath identifies the intended element.
6. Do not use CSS selectors or JavaScript expressions.
7. Do not reference elements that are not present in the supplied HTML.

Examples:

- //input[@id='email']
- //input[@name='username']
- //button[@type='submit']
- (//input[@type='text'])[1]

## 6. STEP GENERATION

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
14. Do not combine inputs from independent forms into one step.
15. When an action submits a form, include all relevant inputs belonging to that form in the same step.
16. Do not assume that an action leads to a particular page or that the resulting operation succeeds.

## 7. OUTPUT FORMAT

Return strictly valid JSON.

The root must be an object containing a 'steps' array.

Each array element represents one sequential interaction step.

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

- The root must always be an object containing the 'steps' array.
- 'steps' must always be an array.
- Each array element represents one sequential interaction step.
- 'inputs' must always be an array.
- 'action' must be an object or null.
- Each step must contain exactly one action at most.
- Each input must contain only 'element' and 'value'.
- Each action must contain only 'element' and 'action'.
- 'element' must contain a valid XPath expression.
- All input values must be strings.
- Do not include explanations, markdown, comments, or additional properties.
- If no suitable interaction exists, return {"steps": []}.

## 8. OUTPUT VALIDATION

Before returning the result, internally validate the generated JSON against these requirements:

1. The output must be syntactically valid JSON.
2. The root must be an object containing only the 'steps' property.
3. 'steps' must be an array.
4. Every step must contain exactly the 'inputs' and 'action' properties.
5. Every input must contain exactly the 'element' and 'value' properties.
6. Every non-null action must contain exactly the 'element' and 'action' properties.
7. All XPath expressions must be valid XPath expressions.
8. All input values must be strings.
9. Every action must use the supported action name 'click'.
10. Do not include additional properties or explanatory text.

If any validation requirement is not satisfied, correct the output before returning it.

Return ONLY the JSON object. Do not include Markdown code fences, explanations, or any other text.

## 9. HTML

***HTML***

Analyze the supplied HTML and generate the interaction steps following all the instructions above.
        `;

        prompt = prompt.replaceAll("***HTML***", html);

        const response = await llm.generate({ prompt: prompt, json: true });

        return response;
    }
}

module.exports = Generate;