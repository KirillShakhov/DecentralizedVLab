import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, Button, Card, CardContent, CardActionArea,
  Chip, Skeleton, IconButton, Tooltip, Breadcrumbs, Link,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LockIcon from '@mui/icons-material/Lock'
import type { Course, User } from '../types'
import { courseDB } from '../db'
import { useRecentSessions } from '../hooks/useCourseStore'

const LANG_LABELS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript',
  lua: 'Lua', sqlite: 'SQLite', java: 'Java',
}
const LANG_COLORS: Record<string, string> = {
  python: '#3572A5', javascript: '#f7df1e',
  lua: '#000080', sqlite: '#003B57', java: '#b07219',
}

interface Props {
  user: User
}

export default function CoursePage({ user }: Props) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { createSession } = useRecentSessions()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingLab, setStartingLab] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    courseDB.get(courseId).then(c => {
      setCourse(c ?? null)
      setLoading(false)
    })
  }, [courseId])

  const handleStartLab = async (labId: string) => {
    if (!course) return
    const lab = course.labs.find(l => l.id === labId)
    if (!lab) return

    setStartingLab(labId)
    try {
      const sessionId = await createSession(
        lab.id, course.id, lab.title, course.title, lab.language,
      )
      navigate(`/session/${sessionId}`)
    } finally {
      setStartingLab(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ bgcolor: '#222' }} />
        <Skeleton variant="rounded" height={120} sx={{ bgcolor: '#222', mt: 2 }} />
      </Box>
    )
  }

  if (!course) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Курс не найден</Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>На главную</Button>
      </Box>
    )
  }

  const isOwner = course.authorId === user.id

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>

      {/* Навигация */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer' }}
        >
          Главная
        </Link>
        <Typography color="text.primary">{course.title}</Typography>
      </Breadcrumbs>

      {/* Заголовок курса */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconButton size="small" onClick={() => navigate('/')} sx={{ color: '#666' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight="bold">{course.title}</Typography>
          </Box>
          <Typography color="text.secondary" sx={{ ml: 5 }}>
            {course.description || 'Без описания'}
          </Typography>
          <Box sx={{ ml: 5, mt: 1, display: 'flex', gap: 1 }}>
            <Chip size="small" label={`Автор: ${course.authorName}`} sx={{ bgcolor: '#1e1e1e' }} />
            <Chip size="small" label={`${course.labs.length} лаб.`} sx={{ bgcolor: '#1e1e1e' }} />
          </Box>
        </Box>
        {isOwner && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/courses/${course.id}/edit`)}
          >
            Редактировать
          </Button>
        )}
      </Box>

      {/* Список лабораторных */}
      {course.labs.length === 0 ? (
        <Card sx={{ bgcolor: '#141414', border: '1px dashed #333' }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">В этом курсе пока нет лабораторных</Typography>
            {isOwner && (
              <Button sx={{ mt: 2 }} onClick={() => navigate(`/courses/${course.id}/edit`)}>
                Добавить лабораторную
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {course.labs
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((lab, idx) => (
              <Card key={lab.id} sx={{
                bgcolor: '#141414', border: '1px solid #2a2a2a',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: '#444' },
              }}>
                <CardActionArea onClick={() => handleStartLab(lab.id)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                    {/* Номер */}
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%',
                      bgcolor: '#1e1e1e', border: '1px solid #333',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Typography variant="body2" fontWeight="bold" color="text.secondary">
                        {idx + 1}
                      </Typography>
                    </Box>

                    {/* Инфо */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography fontWeight="bold" noWrap>{lab.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box', WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {lab.description || 'Без описания'}
                      </Typography>
                    </Box>

                    {/* Метки */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      <Chip
                        size="small"
                        label={LANG_LABELS[lab.language] ?? lab.language}
                        sx={{
                          bgcolor: `${LANG_COLORS[lab.language]}22`,
                          color: LANG_COLORS[lab.language] ?? '#aaa',
                          border: `1px solid ${LANG_COLORS[lab.language] ?? '#444'}44`,
                        }}
                      />
                      {lab.testCases.length > 0 && (
                        <Chip size="small" label={`${lab.testCases.length} тестов`} sx={{ bgcolor: '#1e1e1e' }} />
                      )}
                    </Box>

                    {/* Кнопка запуска */}
                    <Tooltip title="Открыть лабораторную">
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={startingLab === lab.id}
                        onClick={e => { e.stopPropagation(); handleStartLab(lab.id) }}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
        </Box>
      )}
    </Box>
  )
}
