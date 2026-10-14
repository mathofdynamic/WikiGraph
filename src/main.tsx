import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Self-hosted Latin typography: Inter weights 400, 500, 600, 700 only
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
