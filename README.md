# PsFi — Finance Control Center

A responsive, interactive personal finance dashboard designed for India. It uses INR throughout and runs entirely in your browser. Your plan is held in local page state; this starter does not connect to a bank or store data on a server.

## What you can do

- Switch between monthly and annual income views.
- Edit income and spending categories; use sliders to adjust savings, investments, debt payments, and expected returns.
- Explore a 12-month savings and investment projection and card payoff estimate.
- Export the current plan as a JSON snapshot.
- Use the dashboard on desktop or mobile.

Numbers are illustrative planning inputs, not financial advice. Investment projections are estimates and do not guarantee returns.

## Run locally

Install Node.js 20 or newer, then from this folder run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite. To check the production bundle locally:

```bash
npm run build
npm run preview
```

## Publish with GitHub and Vercel Hobby

1. Create a new empty repository on GitHub.
2. Extract this ZIP, open a terminal in the `finance-control-center` folder, and initialize/push the project:

   ```bash
   git init
   git add .
   git commit -m "Add PsFi Finance Control Center"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   Replace the remote URL with the repository URL shown by GitHub.

3. Sign in to Vercel, choose **Add New → Project**, and import the GitHub repository.
4. Keep the detected **Vite** framework settings. The build command is `npm run build`; the output directory is `dist`. No environment variables are needed.
5. Select the **Hobby** plan and deploy. Vercel will provide a `*.vercel.app` URL. Later pushes to `main` deploy updates automatically.

## Project details

- React 18, TypeScript, Vite 6, Recharts, Lucide icons.
- Static client-side app; no API keys, backend, or database required.

