AI Agent Instruction Prompt

Copy and paste the text below into your AI Agent (Cursor, Copilot Workspace, Aider, or ChatGPT):

ROLE: Senior Frontend DevOps Engineer.
OBJECTIVE: Deploy the "Expat Ops Dashboard" (React/Vite) to GitHub Pages from a Private Repository.
INPUT: I will provide the code for a single file: expat_dashboard.tsx.

EXECUTION PLAN (DO THIS):

SCAFFOLDING

Initialize a new Vite project named expat-ops-dashboard using the react-ts (TypeScript) template.

Action: Run npm create vite@latest expat-ops-dashboard -- --template react-ts.

Install these specific dependencies immediately:

lucide-react (for icons).

gh-pages (as a dev dependency, for deployment).

tailwindcss, postcss, autoprefixer (as dev dependencies).

Initialize Tailwind: Run npx tailwindcss init -p.

CONFIGURATION (CRITICAL)

Tailwind: Overwrite tailwind.config.js. Set the content array strictly to: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'] to ensure styles are not purged.

Styles: Overwrite src/index.css. Delete all default CSS and insert the 3 standard Tailwind directives (@tailwind base; etc.).

Vite Base Path: Modify vite.config.ts. You MUST add base: './', (relative path) to the config object.

Reasoning: Since this is a private repo, the absolute path might vary or be obscured. Relative paths ensure assets load regardless of the repo name or domain structure.

CODE INTEGRATION

Delete the default src/App.tsx.

Create a new src/App.tsx and populate it with the exact content of the provided expat_dashboard.tsx file.

Ensure the import of App.tsx in main.tsx is correct.

DEPLOYMENT SCRIPTING

Open package.json.

Add a homepage field at the top level: "." (This safeguards path resolution).

Update the scripts section. Add/Modify:

"predeploy": "npm run build"

"deploy": "gh-pages -d dist"

EXECUTION INSTRUCTIONS

Provide me with the specific Git commands to initialize the repo and push to my private remote origin.

Tell me the exact command to trigger the deployment (npm run deploy).

Manual Execution Checklist (If doing it yourself)

If you prefer to run the terminal commands yourself, follow this sequence:

1. Setup

npm create vite@latest expat-ops-dashboard -- --template react-ts
cd expat-ops-dashboard
npm install
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer gh-pages
npx tailwindcss init -p


2. Config Files

tailwind.config.js

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


vite.config.ts (Note the base setting)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', 
})


3. The Code

Open src/index.css and replace contents with:

@tailwind base;
@tailwind components;
@tailwind utilities;


Open src/App.tsx, delete everything, and paste the code from your expat_dashboard.tsx.

4. Deploy (The Private Repo Method)

Open package.json and add these scripts:

"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}


The Git/Deploy Commands:

Create a repository on GitHub (Select "Private").

Run these commands in your terminal:

git init
git add .
git commit -m "Initial commit of Expat Ops"
git branch -M main
git remote add origin [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
git push -u origin main

# The Magic Command to Deploy
npm run deploy


Note: Since it is a private repo, you may need to go to the Repo Settings > Pages and ensure the source is set to the gh-pages branch. If you are on a free GitHub plan, Pages might not be visible for private repos. If that happens, change the repo visibility to Public temporarily, or use Vercel (drag and drop the folder) which handles private repos for free.