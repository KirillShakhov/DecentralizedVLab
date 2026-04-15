import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Select, MenuItem, FormControl, InputLabel,
  Button, Chip, Typography, CircularProgress, IconButton,
  Tooltip, Divider, Collapse,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import Terminal from '../Terminal/Terminal';
import FileTree from '../FileTree/FileTree';
import MultiFileEditor from '../Editor/MultiFileEditor';
import TestPanel from '../TestPanel/TestPanel';
import ParticipantList from '../ParticipantList/ParticipantList';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';
import { useYjsSession } from '../../hooks/useYjsSession';
import { useTestRunner } from '../../hooks/useTestRunner';
import type { Lab, User } from '../../types';

const COMPILERS: Record<string, any> = {
  [PythonCompiler.id]: PythonCompiler,
  [JavascriptCompiler.id]: JavascriptCompiler,
  [JavaCompiler.id]: JavaCompiler,
  [SQLiteCompiler.id]: SQLiteCompiler,
  [LuaCompiler.id]: LuaCompiler,
};

const STORAGE_KEY = 'vlab_selected_compiler';

interface WorkspaceProps {
  roomId: string;
  isOnline: boolean;
  lab?: Lab;
  user?: User | null;
}

export default function Workspace({ roomId, isOnline, lab, user }: WorkspaceProps) {
  const [currentLang, setCurrentLang] = useState(() =>
    lab?.language ?? localStorage.getItem(STORAGE_KEY) ?? ''
  );
  const [output, setOutput] = useState(currentLang ? 'Подключение к комнате...' : 'Выберите язык');
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [showDescription, setShowDescription] = useState(true);

  const initialFiles: Record<string, string> = lab?.files
    ? Object.fromEntries(lab.files.map(f => [f.path, f.content]))
    : {};

  const {
    yfiles, fileList, activeFile, setActiveFile,
    addFile, deleteFile, getFiles, participants,
  } = useYjsSession(roomId, isOnline, initialFiles, user);

  const compiler = COMPILERS[currentLang] ?? null;
  const { results, running, runTests, summary } = useTestRunner(getFiles, compiler);

  // Синхронизируем вкладки с fileList
  useEffect(() => {
    if (fileList.length === 0) return;
    setOpenFiles(prev => {
      const valid = prev.filter(p => fileList.includes(p));
      const merged = (valid.includes(activeFile) || !activeFile)
        ? valid
        : [...valid, activeFile];
      return merged.length > 0 ? merged : [fileList[0]];
    });
  }, [fileList, activeFile]);

  // ── Компилятор ───────────────────────────────────────────────────────────

  const checkCompiler = useCallback(async (langId: string) => {
    if (!langId || !COMPILERS[langId]) return;
    const downloaded = await COMPILERS[langId].isDownloaded();
    setStatus(prev => ({ ...prev, isDownloaded: downloaded }));
  }, []);

  useEffect(() => { checkCompiler(currentLang); }, [currentLang, checkCompiler]);

  useEffect(() => {
    const setup = async () => {
      if (!currentLang || !COMPILERS[currentLang]) return;
      const c = COMPILERS[currentLang];
      const downloaded = await c.isDownloaded();

      if (!isOnline && !downloaded) {
        setIsEngineReady(false);
        setOutput(`⚠️ ОФЛАЙН:\nДвижок "${c.name}" не загружен.\nСкачайте движок при наличии сети.`);
        return;
      }

      setIsEngineReady(false);
      try {
        if (isOnline && !downloaded) setOutput(`⏳ Загрузка ${c.name}...`);
        await c.init();
        setIsEngineReady(true);
        setOutput(`✅ ${c.name} готов.`);
      } catch (err: any) {
        setOutput(`❌ Ошибка инициализации:\n${err.message}`);
      }
    };
    if (!status.isDownloading) setup();
  }, [currentLang, status.isDownloaded, status.isDownloading, isOnline]);

  const handleLangChange = (e: any) => {
    const lang = e.target.value;
    setCurrentLang(lang);
    if (!lab) localStorage.setItem(STORAGE_KEY, lang);
    setIsEngineReady(false);
  };

  const handleDownload = async () => {
    if (!currentLang) return;
    setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
    try {
      await COMPILERS[currentLang].downloadForOffline(
        (p: number) => setStatus(prev => ({ ...prev, progress: p }))
      );
      await checkCompiler(currentLang);
    } catch { alert('Ошибка загрузки'); }
    finally { setStatus(prev => ({ ...prev, isDownloading: false })); }
  };

  const handleReset = () => {
    if (!lab?.files?.[0]) return;
    const ytext = yfiles.get(lab.files[0].path);
    if (!ytext) return;
    ytext.delete(0, ytext.length);
    ytext.insert(0, lab.files[0].content);
    setOutput('Код сброшен к шаблону.');
  };

  const runCode = async () => {
    if (!isEngineReady) { setOutput('❌ Движок не готов.'); return; }
    setOutput('⏳ Выполнение...');
    try {
      await compiler.run(getFiles(), setOutput);
    } catch (err: any) {
      setOutput(`❌ Ошибка:\n${err.message}`);
    }
  };

  // ── Вкладки ──────────────────────────────────────────────────────────────

  const openTab = (path: string) => {
    setActiveFile(path);
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
  };

  const closeTab = (path: string) => {
    setOpenFiles(prev => {
      const next = prev.filter(p => p !== path);
      if (path === activeFile && next.length > 0) setActiveFile(next[next.length - 1]);
      return next;
    });
  };

  const handleAddFile = (path: string) => {
    addFile(path, '');
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
  };

  const readOnlyFiles = lab?.files?.filter(f => f.readOnly).map(f => f.path) ?? [];
  const hasTests = (lab?.testCases?.length ?? 0) > 0;
  const effectiveOpenFiles = openFiles.length > 0 ? openFiles : fileList.slice(0, 1);

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)', bgcolor: '#0a0a0a', overflow: 'hidden',
    }}>

      {/* ── Панель управления ── */}
      <Paper elevation={0} sx={{
        px: 2, py: 0.75, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: '#141414', borderRadius: 0, borderBottom: '1px solid #2a2a2a',
      }}>
        {/* Левая часть */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lab && (
            <>
              <Typography variant="body2" fontWeight="bold" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                {lab.title}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ bgcolor: '#333' }} />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel sx={{ color: '#666' }}>Среда</InputLabel>
            <Select
              value={currentLang} label="Среда" onChange={handleLangChange}
              disabled={!!lab}
              sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' }, bgcolor: '#1a1a1a' }}
            >
              <MenuItem value=""><em>Выбрать</em></MenuItem>
              {Object.values(COMPILERS).map((c: any) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {lab?.description && (
            <Tooltip title={showDescription ? 'Скрыть задание' : 'Показать задание'}>
              <IconButton size="small" onClick={() => setShowDescription(s => !s)}
                sx={{ color: showDescription ? '#2196f3' : '#555' }}>
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {lab && (
            <Tooltip title="Сбросить к шаблону">
              <IconButton size="small" onClick={handleReset} sx={{ color: '#555', '&:hover': { color: '#fff' } }}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Правая часть: участники + статус движка */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ParticipantList participants={participants} currentUserId={user?.id} />

          {participants.length > 0 && <Divider orientation="vertical" flexItem sx={{ bgcolor: '#333' }} />}

          {status.isDownloading && (
            <Chip icon={<CircularProgress size={12} color="inherit" />}
              label={`${status.progress}%`} color="primary" variant="outlined" size="small" />
          )}
          {currentLang && !status.isDownloaded && !status.isDownloading && (
            <Button size="small" variant="contained" startIcon={<CloudDownloadIcon />}
              onClick={handleDownload} sx={{ bgcolor: '#2e7d32', py: 0.5 }}>
              Скачать движок
            </Button>
          )}
          {status.isDownloaded && (
            <Chip icon={<CloudDoneIcon sx={{ color: '#4caf50 !important' }} />}
              label="Offline" variant="outlined" size="small"
              sx={{ color: '#4caf50', borderColor: '#4caf50' }} />
          )}
        </Box>
      </Paper>

      {/* ── Описание задания (сворачиваемое) ── */}
      {lab?.description && (
        <Collapse in={showDescription}>
          <Box sx={{
            px: 2, py: 1, bgcolor: '#0f1a2a',
            borderBottom: '1px solid #1a2a3a',
            maxHeight: 120, overflow: 'auto',
          }}>
            <Typography variant="body2" color="#90caf9" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {lab.description}
            </Typography>
          </Box>
        </Collapse>
      )}

      {/* ── Основная область ── */}
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>

        {/* FileTree */}
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <FileTree
            fileList={fileList}
            activeFile={activeFile}
            readOnlyFiles={readOnlyFiles}
            onSelect={openTab}
            onAdd={handleAddFile}
            onDelete={deleteFile}
          />
        </Box>

        {/* Editor */}
        <Box sx={{ flexGrow: 1, minWidth: 0, borderRight: '1px solid #2a2a2a' }}>
          {!currentLang ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1e1e1e' }}>
              <Typography color="text.secondary">Выберите язык программирования</Typography>
            </Box>
          ) : (
            <MultiFileEditor
              yfiles={yfiles}
              activeFile={activeFile}
              openFiles={effectiveOpenFiles}
              onSwitchTab={openTab}
              onCloseTab={closeTab}
            />
          )}
        </Box>

        {/* Правая колонка: Terminal + TestPanel */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Terminal */}
          <Box sx={{
            flexGrow: 1, bgcolor: '#000', minHeight: 0,
            borderBottom: hasTests ? '1px solid #2a2a2a' : 'none',
          }}>
            <Terminal output={output} isWasmReady={isEngineReady} onRunCode={runCode} />
          </Box>

          {/* TestPanel */}
          {hasTests && (
            <Box sx={{ flexShrink: 0, maxHeight: '45%', display: 'flex', flexDirection: 'column' }}>
              <TestPanel
                testCases={lab!.testCases}
                results={results}
                running={running}
                summary={summary}
                isEngineReady={isEngineReady}
                onRunTests={() => runTests(lab!.testCases)}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
