import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Импорты MUI
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

registerSW({ immediate: true })

// Создаем строгую темную тему, подходящую для IDE
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#121212', // Цвет фона всей страницы
            paper: '#1e1e1e',   // Цвет панелей и карточек
        },
        primary: {
            main: '#2563eb', // Синий для акцентных кнопок
        },
        success: {
            main: '#10b981', // Зеленый для статуса "Скачано/Онлайн"
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>,
)