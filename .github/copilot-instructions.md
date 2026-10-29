# MyHealth Score

MyHealth Score is a web application that lets a user enter simple health and lifestyle information and receive:

- An overall MyHealth Score from 0 to 10
- Category-specific subscores
- Assessment completeness/confidence based on the amount of data provided
- Alerts and simple recommendations
- A history of previous recordings
- Progression plots showing overall and category scores over time

The application is an educational wellness tool and is not intended for medical diagnosis.

## Technology

Use:

- Plain HTML
- Plain CSS
- Plain JavaScript
- Vite

Do not introduce React, Vue, TypeScript, Tailwind, Bootstrap or other frameworks/libraries unless I explicitly ask for them.

Keep the code simple and understandable for a beginner.

## File structure

IMPORTANT: use **one HTML file for each screen**.

Example:

myhealth-score/
├── .github/
│   └── copilot-instructions.md
├── design/
│   ├── login.html
│   ├── basic-profile.html
│   ├── body-composition.html
│   └── ...
├── screens/
│   ├── login.html
│   ├── basic-profile.html
│   ├── body-composition.html
│   └── ...
├── src/
│   ├── style.css
│   └── main.js
├── index.html
└── package.json

The files inside `design/` are exported from Google Stitch.

They are **visual references**, not final production code.

Rebuild their appearance using simpler, cleaner HTML and CSS.

## Design rules

When a Stitch design file is provided:

- Preserve the general layout
- Preserve the visual hierarchy
- Preserve important labels
- Preserve the category colors
- Preserve spacing and overall aesthetic where reasonable
- Simplify unnecessarily complicated generated HTML
- Remove duplicated or useless wrappers
- Avoid large amounts of inline styling
- Prefer reusable CSS classes
- Keep accessibility in mind
- Make the design responsive

Do not blindly copy Stitch-generated code if there is a simpler implementation.

## Application flow

The main screens are:

1. Login / register
2. User dashboard / previous recordings
3. Basic Profile — Step 1 of 8
4. Body Composition — Step 2 of 8
5. Physical Activity — Step 3 of 8
6. Diet — Step 4 of 8
7. Sleep — Step 5 of 8
8. Mental Health — Step 6 of 8
9. Lifestyle Habits — Step 7 of 8
10. Optional Health Data — Step 8 of 8
11. Main Results
12. Alerts & Recommendations
13. Progress

## Category colors

Use the same category colors consistently throughout the application:

- Body composition: blue
- Physical activity: orange
- Diet: green
- Sleep: purple
- Mental health: pink / rose
- Lifestyle habits: yellow / gold
- Optional cardiovascular data: teal

## Coding rules

Build **one screen at a time**.

Do not modify unrelated screens when implementing a ticket.

Each screen must have its own HTML file.

Shared styles should go into `src/style.css` instead of being duplicated in every HTML file.

Shared JavaScript behavior can go into `src/main.js` when appropriate.

Keep JavaScript simple.

Do not build the backend, API or database unless the current ticket explicitly asks for it.

When implementing a screen:

1. Inspect the corresponding file in `design/`.
2. Identify the important visual structure.
3. Rebuild it in clean HTML/CSS.
4. Add only the functionality required by the current ticket.
5. Check that navigation buttons point to the appropriate screen.
6. Do not implement future functionality unnecessarily.

Always explain briefly:
- What files you changed
- What functionality you added
- Any assumptions you made

Build one ticket at a time.