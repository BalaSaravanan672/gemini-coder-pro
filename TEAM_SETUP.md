# Gemini Coder Pro: Team Setup Guide

This guide explains how to set up Gemini Coder Pro for your team. This configuration uses a **Server-Backed Mode**, which allows the team to use the AI agent without needing direct access to the `gemini.json` credentials file.

---

## 1. Gateway Server Setup (Admin Only)
One person (the Admin) runs the server on a machine that has the Google Cloud credentials.

1.  **Set up Credentials:** Ensure your `gemini.json` is secure on this machine.
2.  **Configure Environment:**
    ```bash
    # Path to your Google Cloud credentials
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/gemini.json"
    
    # Secret token your team will use to authenticate with this server
    export GEMINI_CODER_SERVER_TOKEN="your-team-shared-secret"
    ```
3.  **Start the Server:**
    ```bash
    # From the Gemini Coder root directory
    npm run serve
    ```
    The server will now listen on `http://0.0.0.0:8787`.

---

## 2. Team Member Setup (Clients)
Team members only need to install the CLI and point it to the Gateway Server. They **do not** need a `gemini.json` file.

### Installation
Install the Gemini Coder CLI globally (replace with your actual package name if published):
```bash
npm install -g gemini-coder-pro
```

### Configuration
Add these lines to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
# The IP or hostname of the Gateway Server
export GEMINI_CODER_SERVER_URL="http://<gateway-server-ip>:8787"

# The shared secret provided by your Admin
export GEMINI_CODER_SERVER_TOKEN="your-team-shared-secret"
```
Reload your shell: `source ~/.zshrc`

### Usage
Navigate to any project you want to work on and start the agent:
```bash
cd /path/to/your/project
gemini chat
```

---

## 3. Security Best Practices
*   **Token Rotation:** Change the `GEMINI_CODER_SERVER_TOKEN` periodically if team members leave.
*   **VPN/Firewall:** If your Gateway Server is on a public IP, ensure it is only accessible via a VPN or restricted to your team's IP range.
*   **No Local Keys:** Remind team members they should **never** download or store `gemini.json` on their local machines.

---

## Troubleshooting
*   **Connection Refused:** Ensure the Gateway Server is running and the `<gateway-server-ip>` is correct.
*   **Unauthorized:** Double-check that your `GEMINI_CODER_SERVER_TOKEN` matches exactly what is on the server.
