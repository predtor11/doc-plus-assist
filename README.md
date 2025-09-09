# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/783997ea-cab6-4e5f-9aca-08f482cfa4cb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/783997ea-cab6-4e5f-9aca-08f482cfa4cb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database & Authentication)
- LM Studio (Local AI Inference)

## LM Studio Setup for AI Chat Features

This application includes AI chat functionality powered by LM Studio. To use AI features, each user must run LM Studio locally on their computer:

### Setup Instructions:

1. **Download LM Studio**: Visit [lmstudio.ai](https://lmstudio.ai) and download the application for your operating system

2. **Download a Model**: 
   - Open LM Studio
   - Go to the "My Models" tab
   - Search for and download a GPT model (GPT-2, GPT-J, or Llama models work well)

3. **Load the Model**:
   - Go to the "Chat" tab in LM Studio
   - Select your downloaded model from the dropdown
   - Click "Load Model"

4. **Start Local Server**:
   - Go to the "Local Server" tab
   - Click "Start Server"
   - Ensure the server is running on `http://127.0.0.1:1234`

5. **Verify Connection**:
   - In the web application, start an AI chat session
   - The app will automatically detect your local LM Studio server
   - Click "Check Status" if needed to verify the connection

### Important Notes:

- **Local Processing**: Each user runs their own LM Studio instance locally for privacy and performance
- **No Cloud Dependency**: AI responses are generated locally, not sent to external servers
- **Model Requirements**: Ensure you have enough RAM for the model you choose (4GB+ recommended)
- **Network**: The web app connects directly to `127.0.0.1:1234` on your local machine

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/783997ea-cab6-4e5f-9aca-08f482cfa4cb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
