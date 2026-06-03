# Gemini Coder Pro

Gemini Coder Pro is a TypeScript CLI agent for local code navigation, review, and surgical edits.

## Install

```bash
npm install -g gemini-coder
```

## Run

```bash
gemini-coder chat
```

## Build from source

```bash
npm install
npm run build
npm start
```

## Authentication

Server-backed auth is supported. Run the Gemini Coder server on a trusted machine that has access to Google credentials, then point client machines at it with `GEMINI_CODER_SERVER_URL`.

Server example:

```bash
export GEMINI_CODER_SERVER_TOKEN=your-shared-secret
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/gemini.json
npm run serve
```

Client example:

```bash
export GEMINI_CODER_SERVER_URL=http://your-server:8787
export GEMINI_CODER_SERVER_TOKEN=your-shared-secret
gemini-coder chat
```

If the client is on a different computer, use the server machine's LAN IP or hostname in `GEMINI_CODER_SERVER_URL`. The server now listens on `0.0.0.0` by default so it can accept remote connections.

For local source runs, the CLI still supports a `gemini.json` file in the workspace root as a fallback.

## Notes

- The published package includes the compiled `dist/` output only.
- Users should run the CLI inside their own workspace because the agent reads local files and git context.
