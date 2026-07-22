import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { applyTheme, loadStoredThemeId } from './lib/theme/applyTheme';

applyTheme(loadStoredThemeId());

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
