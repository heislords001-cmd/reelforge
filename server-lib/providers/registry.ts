import { env } from '../config/env';
import { GroqScriptProvider } from './script/groqProvider';
import { NvidiaReasoningScriptProvider } from './script/nvidiaReasoningProvider';
import { NvidiaFluxProvider } from './image/fluxProvider';
import { NvidiaChatterboxProvider } from './voice/chatterboxProvider';
import { ImageProvider, ScriptProvider, VoiceProvider } from './types';

/**
 * The provider registry is the ONLY file in the codebase that imports a concrete vendor
 * implementation. Services ask the registry for "the current script provider" and get back
 * something satisfying `ScriptProvider`. They never know or care that it's Groq.
 *
 * To add a new provider:
 *   1. Implement the relevant interface in providers/<capability>/yourProvider.ts
 *   2. Register it below
 *   3. (optional) expose it as a user-selectable option via projectSettings
 *
 * Nothing in services/ or routes/ needs to change.
 */
class ProviderRegistry {
  private scriptProviders = new Map<string, ScriptProvider>();
  private imageProviders = new Map<string, ImageProvider>();
  private voiceProviders = new Map<string, VoiceProvider>();

  private defaultScript = 'nvidia-free';
  private defaultImage = 'nvidia-flux-schnell';
  private defaultVoice = 'nvidia-chatterbox';

  registerScriptProvider(provider: ScriptProvider) {
    this.scriptProviders.set(provider.name, provider);
  }
  registerImageProvider(provider: ImageProvider) {
    this.imageProviders.set(provider.name, provider);
  }
  registerVoiceProvider(provider: VoiceProvider) {
    this.voiceProviders.set(provider.name, provider);
  }

  getScriptProvider(name = this.defaultScript): ScriptProvider {
    const provider = this.scriptProviders.get(name);
    if (!provider) throw new Error(`No script provider registered under "${name}"`);
    return provider;
  }
  getImageProvider(name = this.defaultImage): ImageProvider {
    const provider = this.imageProviders.get(name);
    if (!provider) throw new Error(`No image provider registered under "${name}"`);
    return provider;
  }
  getVoiceProvider(name = this.defaultVoice): VoiceProvider {
    const provider = this.voiceProviders.get(name);
    if (!provider) throw new Error(`No voice provider registered under "${name}"`);
    return provider;
  }
}

export const providerRegistry = new ProviderRegistry();

// --- Wiring: today's providers. Add new `registerXProvider` calls here as they're built. ---
// Free and premium script tiers both run on NVIDIA's catalog (same NVIDIA_API_KEY), just
// different model strings. See server-lib/services/subscriptionService.ts for which name
// gets requested based on a user's plan.
providerRegistry.registerScriptProvider(new NvidiaReasoningScriptProvider('nvidia-free', env.nvidia.scriptModelFree));
providerRegistry.registerScriptProvider(new NvidiaReasoningScriptProvider('nvidia-premium', env.nvidia.scriptModelPremium));
providerRegistry.registerScriptProvider(new GroqScriptProvider());
providerRegistry.registerImageProvider(new NvidiaFluxProvider());
providerRegistry.registerVoiceProvider(new NvidiaChatterboxProvider());
