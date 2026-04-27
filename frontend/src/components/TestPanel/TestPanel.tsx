import React, { useState } from 'react'
import {
  Box, Typography, Button, CircularProgress, Chip,
  Collapse, IconButton, Tooltip, LinearProgress,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import type { TestCase } from '../../types'
import type { TestResult, TestStatus } from '../../hooks/useTestRunner'

// ─── Иконка статуса ───────────────────────────────────────────────────────────

function StatusIcon({ status, size = 18 }: { status: TestStatus; size?: number }) {
  const sx = { fontSize: size }
  switch (status) {
    case 'pass':    return <CheckCircleIcon sx={{ ...sx, color: '#4caf50' }} />
    case 'fail':    return <CancelIcon sx={{ ...sx, color: '#f44336' }} />
    case 'error':   return <ErrorIcon sx={{ ...sx, color: '#ff9800' }} />
    case 'running': return <CircularProgress size={size - 2} sx={{ color: '#2196f3' }} />
    default:        return <HourglassEmptyIcon sx={{ ...sx, color: '#555' }} />
  }
}

// ─── Одна строка теста ────────────────────────────────────────────────────────

function TestRow({
  tc, result, index,
}: {
  tc: TestCase
  result: TestResult | undefined
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const status: TestStatus = result?.status ?? 'pending'
  const canExpand = !tc.isHidden && result && (status === 'fail' || status === 'error' || status === 'pass')

  return (
    <Box sx={{ borderBottom: '1px solid #1e1e1e' }}>
      {/* Заголовок теста */}
      <Box
        onClick={() => canExpand && setExpanded(e => !e)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.75,
          cursor: canExpand ? 'pointer' : 'default',
          '&:hover': canExpand ? { bgcolor: '#1a1a1a' } : {},
        }}
      >
        <StatusIcon status={status} />

        <Typography variant="body2" sx={{ flexGrow: 1, color: '#ccc', fontSize: 12 }} noWrap>
          #{index + 1} {tc.description || `Тест ${index + 1}`}
        </Typography>

        {tc.isHidden && (
          <Tooltip title="Скрытый тест">
            <VisibilityOffIcon sx={{ fontSize: 14, color: '#555' }} />
          </Tooltip>
        )}

        {result && result.executionMs > 0 && (
          <Typography variant="caption" sx={{ color: '#555', fontSize: 11 }}>
            {result.executionMs} мс
          </Typography>
        )}

        {canExpand && (
          <IconButton size="small" sx={{ p: 0.25, color: '#555' }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        )}
      </Box>

      {/* Детали (только для не-скрытых тестов с результатом) */}
      {canExpand && (
        <Collapse in={expanded}>
          <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tc.input && (
              <Box>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                  Входные данные:
                </Typography>
                <Box sx={{
                  bgcolor: '#0a0a0a', p: 1, borderRadius: 1, border: '1px solid #222',
                  fontFamily: 'monospace', fontSize: 11, color: '#aaa', whiteSpace: 'pre-wrap',
                }}>
                  {tc.input || '(пусто)'}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                  Ожидаемый вывод:
                </Typography>
                <Box sx={{
                  bgcolor: '#0a1a0a', p: 1, borderRadius: 1,
                  border: '1px solid #1a2a1a',
                  fontFamily: 'monospace', fontSize: 11, color: '#81c784', whiteSpace: 'pre-wrap',
                }}>
                  {tc.expectedOutput || '(пусто)'}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                  Фактический вывод:
                </Typography>
                <Box sx={{
                  bgcolor: status === 'pass' ? '#0a1a0a' : '#1a0a0a',
                  p: 1, borderRadius: 1,
                  border: `1px solid ${status === 'pass' ? '#1a2a1a' : '#2a1a1a'}`,
                  fontFamily: 'monospace', fontSize: 11,
                  color: status === 'pass' ? '#81c784' : '#e57373',
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.actualOutput || '(пусто)'}
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

// ─── Панель тестов ────────────────────────────────────────────────────────────

interface Props {
  testCases: TestCase[]
  results: TestResult[]
  running: boolean
  summary: { total: number; passed: number; failed: number; pending: number }
  isEngineReady: boolean
  onRunTests: () => void
}

export default function TestPanel({
  testCases, results, running, summary, isEngineReady, onRunTests,
}: Props) {
  if (testCases.length === 0) {
    return (
      <Box sx={{
        p: 2, textAlign: 'center', bgcolor: '#0d0d0d',
        borderTop: '1px solid #2a2a2a',
      }}>
        <Typography variant="caption" color="text.secondary">
          Нет тест-кейсов
        </Typography>
      </Box>
    )
  }

  const hasResults = results.length > 0
  const allDone = hasResults && summary.pending === 0

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      bgcolor: '#0d0d0d', borderTop: '1px solid #2a2a2a',
      minHeight: 0,
    }}>
      {/* Заголовок + кнопка запуска */}
      <Box sx={{
        px: 1.5, py: 0.75, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
            Тесты
          </Typography>

          {/* Счётчик результатов */}
          {allDone && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {summary.passed > 0 && (
                <Chip label={`✓ ${summary.passed}`} size="small"
                  sx={{ bgcolor: '#1a2a1a', color: '#4caf50', height: 18, fontSize: 10 }} />
              )}
              {summary.failed > 0 && (
                <Chip label={`✗ ${summary.failed}`} size="small"
                  sx={{ bgcolor: '#2a1a1a', color: '#f44336', height: 18, fontSize: 10 }} />
              )}
            </Box>
          )}
        </Box>

        <Button
          size="small"
          variant="contained"
          startIcon={running ? <CircularProgress size={12} color="inherit" /> : <PlayArrowIcon />}
          onClick={onRunTests}
          disabled={running || !isEngineReady}
          sx={{ py: 0.25, fontSize: 11, minWidth: 0 }}
        >
          {running ? 'Идёт...' : 'Запустить'}
        </Button>
      </Box>

      {/* Прогресс-бар во время выполнения */}
      {running && (
        <LinearProgress
          variant="determinate"
          value={summary.total > 0 ? ((summary.passed + summary.failed) / summary.total) * 100 : 0}
          sx={{ height: 2, flexShrink: 0 }}
        />
      )}

      {/* Список тестов */}
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        {testCases.map((tc, idx) => (
          <TestRow
            key={tc.id}
            tc={tc}
            index={idx}
            result={results.find(r => r.testId === tc.id)}
          />
        ))}
      </Box>
    </Box>
  )
}
