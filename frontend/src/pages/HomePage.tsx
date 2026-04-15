import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Card, CardContent, CardActionArea,
  CardActions, Chip, Grid, Skeleton, Avatar, Divider, IconButton, Tooltip,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SchoolIcon from '@mui/icons-material/School'
import CodeIcon from '@mui/icons-material/Code'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { Course, User } from '../types'
import { useCourseStore, useRecentSessions } from '../hooks/useCourseStore'
import { courseDB } from '../db'
import { demoCourse } from '../data/demoCourse'

const LANG_LABELS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', lua: 'Lua', sqlite: 'SQLite', java: 'Java',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  return `${Math.floor(h / 24)} дн. назад`
}

interface Props {
  user: User
}

export default function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { myCourses, loading, deleteCourse, reload } = useCourseStore(user.id)
  const { sessions, deleteSession } = useRecentSessions()
  const [snackbar, setSnackbar] = React.useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => importRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as Course
      if (!raw.title || !Array.isArray(raw.labs)) throw new Error('Неверный формат')
      const course: Course = {
        ...raw,
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.username,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await courseDB.save(course)
      await reload()
      setSnackbar(`Курс "${course.title}" импортирован`)
    } catch (err: any) {
      setSnackbar(`Ошибка импорта: ${err.message}`)
    }
  }

  const handleLoadDemo = async () => {
    const existing = await courseDB.get(demoCourse.id)
    const course: Course = {
      ...demoCourse,
      id: existing ? crypto.randomUUID() : demoCourse.id,
      authorId: user.id,
      authorName: user.username,
    }
    await courseDB.save(course)
    await reload()
    setSnackbar('Демо-курс загружен!')
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2, py: 3 }}>

      {/* Приветствие */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Привет, {user.username}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Создавайте курсы, запускайте лабораторные и работайте совместно
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          <Tooltip title="Импортировать курс из JSON-файла">
            <Button
              variant="outlined"
              size="large"
              startIcon={<FileUploadIcon />}
              onClick={handleImportClick}
            >
              Импорт
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/courses/new')}
          >
            Новый курс
          </Button>
        </Box>
      </Box>

      {/* Мои курсы */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon fontSize="small" /> Мои курсы
      </Typography>

      {loading ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ bgcolor: '#222' }} />
            </Grid>
          ))}
        </Grid>
      ) : myCourses.length === 0 ? (
        <Card sx={{ bgcolor: '#141414', border: '1px dashed #333', mb: 4 }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <SchoolIcon sx={{ fontSize: 48, color: '#444', mb: 2 }} />
            <Typography color="text.secondary" sx={{ mb: 2 }}>У вас ещё нет курсов</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleLoadDemo}
                sx={{ bgcolor: '#1565c0' }}
              >
                Загрузить демо-курс
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/courses/new')}
              >
                Создать курс
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {myCourses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card sx={{
                bgcolor: '#141414', border: '1px solid #2a2a2a',
                height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: '#444' },
              }}>
                <CardActionArea sx={{ flexGrow: 1 }} onClick={() => navigate(`/courses/${course.id}`)}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {course.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      mt: 0.5, mb: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {course.description || 'Без описания'}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${course.labs.length} лаб.`}
                      sx={{ bgcolor: '#1e3a5f', color: '#90caf9' }}
                    />
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: 'flex-end', px: 1 }}>
                  <Tooltip title="Редактировать">
                    <Button size="small" onClick={() => navigate(`/courses/${course.id}/edit`)}>
                      Изменить
                    </Button>
                  </Tooltip>
                  <Tooltip title="Удалить курс">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm(`Удалить курс "${course.title}"?`)) deleteCourse(course.id)
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 3, borderColor: '#2a2a2a' }} />

      {/* Недавние сессии */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccessTimeIcon fontSize="small" /> Недавние сессии
      </Typography>

      {sessions.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          Нет недавних сессий — откройте лабораторную из курса, чтобы начать
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sessions.map(session => (
            <Card
              key={session.id}
              sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a' }}
            >
              <CardActionArea onClick={() => navigate(`/session/${session.id}`)}>
                <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#1e3a5f', width: 36, height: 36 }}>
                    <CodeIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography fontWeight="medium" noWrap>{session.labTitle}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {session.courseTitle} · {LANG_LABELS[session.language] ?? session.language}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(session.lastActive)}
                    </Typography>
                    <Tooltip title="Удалить из истории">
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                        sx={{ color: '#555', '&:hover': { color: '#f44336' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
