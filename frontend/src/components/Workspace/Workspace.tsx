import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Select, MenuItem, FormControl, InputLabel,
  Button, Chip, Typography, CircularProgress, IconButton,
  Tooltip, Divider, Collapse, Snackbar,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DescriptionIcon from '@mui/icons-material/Description';
import SpeedIcon from '@mui/icons-material/Speed';
import ShareIcon from '@mui/icons-material/Share';

import Terminal from '../Terminal/Terminal';
import FileTree from '../FileTree/FileTree';
import MultiFileEditor from '../Editor/MultiFileEditor';
import TestPanel from '../TestPanel/TestPanel';
import ParticipantList from '../ParticipantList/ParticipantList';
import ProfilerPanel from '../ProfilerPanel/ProfilerPanel';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';
import { useYjsSession } from '../../hooks/useYjsSession';
import { useTestRunner } from '../../hooks/useTestRunner';
import { useProfiler } from '../../hooks/useProfiler';
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
  const [stdin, setStdin] = useState('');
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [showDescription, setShowDescription] = useState(true);
  const [showProfiler, setShowProfiler] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const initialFiles = React.useMemo<Record<string, string>>(() =>
    lab?.files ? Object.fromEntries(lab.files.map(f => [f.path, f.content])) : {},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [roomId]);

  const {
    yfiles, fileList, activeFile, setActiveFile,
    addFile, deleteFile, getFiles, participants,
  } = useYjsSession(roomId, isOnline, initialFiles, user);

  const compiler = COMPILERS[currentLang] ?? null;
  const { results, running, runTests, summary } = useTestRunner(getFiles, compiler);
  const { result: profilerResult, running: profilerRunning, progress: profilerProgress, runBenchmark } =
    useProfiler(getFiles, compiler, currentLang);

  useEffect(() => {
    if (fileList.length === 0) return;

    if (!activeFile || !fileList.includes(activeFile)) {
      setActiveFile(fileList[0]);
    }

    setOpenFiles(prev => {
      const valid = prev.filter(p => fileList.includes(p));
      const merged = (valid.includes(activeFile) || !activeFile)
        ? valid
        : [...valid, activeFile];
      return merged.length > 0 ? merged : [fileList[0]];
    });
  }, [fileList, activeFile]);

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
    if (!lab?.files?.length) return;
    for (const f of lab.files) {
      if (f.readOnly) continue;
      const ytext = yfiles.get(f.path);
      if (!ytext) continue;
      ytext.delete(0, ytext.length);
      ytext.insert(0, f.content);
    }
    setOutput('Код сброшен к шаблону.');
  };

  const runCode = async () => {
    if (!isEngineReady) { setOutput('❌ Движок не готов.'); return; }
    setOutput('⏳ Выполнение...');
    try {
      await compiler.run(getFiles(), setOutput, stdin);
    } catch (err: any) {
      setOutput(`❌ Ошибка:\n${err.message}`);
    }
  };

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

  const handleShare = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    setSnackbar('Ссылка скопирована!')
  }

  const roomCode = roomId.slice(0, 8).toUpperCase()
  const readOnlyFiles = lab?.files?.filter(f => f.readOnly).map(f => f.path) ?? [];
  const hasTests = (lab?.testCases?.length ?? 0) > 0;
  const effectiveOpenFiles = openFiles.length > 0 ? openFiles : fileList.slice(0, 1);
  const hasDescription = !!lab?.description;

  return (
    <>
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)', bgcolor: 'background.default', overflow: 'hidden',
    }}>

      {/* Панель управления */}
      <Paper elevation={0} sx={{
        px: 2, py: 0.75, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: 'background.paper', borderRadius: 0,
        borderBottom: '1px solid', borderColor: 'divider',
        boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
      }}>
        {/* Левая часть */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lab && (
            <>
              <Typography variant="body2" fontWeight={600} color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {lab.title}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />
            </>
          )}

          <Tooltip title="Скопировать ссылку на сессию">
            <Chip
              label={roomCode}
              size="small"
              icon={<ShareIcon sx={{ fontSize: '13px !important' }} />}
              onClick={handleShare}
              sx={{
                bgcolor: 'rgba(79,70,229,0.07)',
                color: 'primary.main',
                border: '1px solid rgba(79,70,229,0.2)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(79,70,229,0.12)' },
              }}
            />
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 13 }}>Среда</InputLabel>
            <Select
              value={currentLang} label="Среда" onChange={handleLangChange}
              disabled={!!lab}
              sx={{
                fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              }}
            >
              <MenuItem value=""><em>Выбрать</em></MenuItem>
              {Object.values(COMPILERS).map((c: any) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13 }}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasDescription && (
            <Tooltip title={showDescription ? 'Скрыть задание' : 'Показать задание'}>
              <IconButton
                size="small"
                onClick={() => setShowDescription(s => !s)}
                sx={{
                  color: showDescription ? 'primary.main' : 'text.secondary',
                  bgcolor: showDescription ? 'rgba(79,70,229,0.08)' : 'transparent',
                }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {lab && (
            <Tooltip title="Сбросить к шаблону">
              <IconButton
                size="small"
                onClick={handleReset}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Профилировщик WASM (бенчмарк)">
            <IconButton
              size="small"
              onClick={() => setShowProfiler(true)}
              disabled={!isEngineReady}
              sx={{
                color: isEngineReady ? '#d97706' : 'text.disabled',
                '&:hover': { color: '#b45309', bgcolor: 'rgba(217,119,6,0.08)' },
              }}
            >
              <SpeedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Правая часть */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ParticipantList participants={participants} currentUserId={user?.id} />

          {participants.length > 0 && <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />}

          {status.isDownloading && (
            <Chip
              icon={<CircularProgress size={12} color="inherit" />}
              label={`${status.progress}%`}
              color="primary" variant="outlined" size="small"
            />
          )}
          {currentLang && !status.isDownloaded && !status.isDownloading && (
            <Button
              size="small" variant="contained" color="success"
              startIcon={<CloudDownloadIcon />}
              onClick={handleDownload}
              sx={{ py: 0.5 }}
            >
              Скачать движок
            </Button>
          )}
          {status.isDownloaded && (
            <Chip
              icon={<CloudDoneIcon sx={{ fontSize: '14px !important' }} />}
              label="Offline" variant="outlined" size="small"
              color="success"
            />
          )}
        </Box>
      </Paper>

      {/* Основная область */}
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
        <Box sx={{ flexGrow: 1, minWidth: 0, borderRight: '1px solid', borderColor: 'divider' }}>
          {!currentLang ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
              <Typography color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                Выберите язык программирования
              </Typography>
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

        {/* Правая колонка: Задание + Terminal + TestPanel */}
        <Box sx={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Описание задания */}
          {hasDescription && (
            <Collapse in={showDescription}>
              <Box sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}>
                <Box sx={{
                  px: 2, py: 1,
                  display: 'flex', alignItems: 'center',
                  borderBottom: '1px solid', borderColor: 'divider',
                }}>
                  <DescriptionIcon sx={{ fontSize: 13, color: 'primary.main', mr: 0.75 }} />
                  <Typography variant="caption" fontWeight={700} color="primary.main"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
                    Задание
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1.5, maxHeight: '28vh', overflow: 'auto' }}>
                  <Typography variant="body2" color="text.primary" sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.85,
                    fontSize: '13px',
                  }}>
                    {lab!.description}
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          )}

          <Box sx={{
            flexGrow: 1, minHeight: 0,
            borderBottom: hasTests ? '1px solid rgba(0,0,0,0.15)' : 'none',
          }}>
            <Terminal
              output={output}
              stdin={stdin}
              isWasmReady={isEngineReady}
              onRunCode={runCode}
              onStdinChange={setStdin}
            />
          </Box>

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

      <ProfilerPanel
        open={showProfiler}
        onClose={() => setShowProfiler(false)}
        result={profilerResult}
        running={profilerRunning}
        progress={profilerProgress}
        isEngineReady={isEngineReady}
        onRunBenchmark={runBenchmark}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={2500}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
