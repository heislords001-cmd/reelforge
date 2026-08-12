# Provider layer

Three interfaces (`types.ts`) define every AI capability the product uses:
`ScriptProvider`, `ImageProvider`, `VoiceProvider`. `registry.ts` is the only file that
imports a concrete vendor SDK/HTTP client and wires it to an interface.

## Adding a new provider (e.g. OpenAI for scripts)

1. Create `providers/script/openAiProvider.ts` implementing `ScriptProvider`.
2. In `registry.ts`: `providerRegistry.registerScriptProvider(new OpenAiScriptProvider())`.
3. Optionally let users choose it per-project by storing the provider name in
   `projects.settings` and passing it to `getScriptProvider(name)`.

## Adding a whole new capability (e.g. Video)

1. Add a `VideoProvider` interface to `types.ts`.
2. Implement it, register it, add a `videoService.ts` that mirrors `imageService.ts`.
3. Add routes under `/api/projects/:id/video`.

No existing route, service, or React component needs to change for either case. This is
what "future-proof" means concretely in this codebase.
