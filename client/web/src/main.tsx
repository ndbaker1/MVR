import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import App from './App';
import './styles/globals.css';

const root = createRoot(document.getElementById('root')!);

root.render(
    <React.StrictMode>
        <MantineProvider withNormalizeCSS withCSSVariables theme={{ colorScheme: 'dark' }}>
            <App />
        </MantineProvider>
    </React.StrictMode>
);
