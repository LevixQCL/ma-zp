import { createLocalBackend } from './local.js';

/** Choisit le mode : Firebase si la configuration est remplie, sinon démo. `?demo` force la démo. */
export async function createBackend(config) {
  const forceDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
  if (!forceDemo && config.firebase && config.firebase.apiKey) {
    const { createFirebaseBackend } = await import('./firebase.js');
    return createFirebaseBackend(config);
  }
  return createLocalBackend(config);
}
