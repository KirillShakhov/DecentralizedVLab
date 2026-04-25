import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

registerSW({ immediate: true })

const theme = createTheme({
    palette: {
        mode: 'light',
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
        primary: {
            main: '#4f46e5',
            light: '#818cf8',
            dark: '#3730a3',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#7c3aed',
        },
        success: {
            main: '#059669',
        },
        warning: {
            main: '#d97706',
        },
        error: {
            main: '#dc2626',
        },
        text: {
            primary: '#1e293b',
            secondary: '#64748b',
        },
        divider: '#e2e8f0',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 10,
    },
    shadows: [
        'none',
        '0 1px 2px rgba(0,0,0,0.06)',
        '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
        '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)',
        '0 20px 25px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.04)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
        '0 25px 50px rgba(0,0,0,0.12)',
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#f8fafc',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 500,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
                notchedOutline: {
                    borderColor: '#e2e8f0',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                },
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>,
)
