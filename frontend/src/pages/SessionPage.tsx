import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import type { Lab, User } from '../types'
import { sessionDB, courseDB } from '../db'
import Workspace from '../components/Workspace/Workspace'

interface Props {
  user: User
  isOnline: boolean
}

export default function SessionPage({ user, isOnline }: Props) {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [lab, setLab] = useState<Lab | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!sessionId) { setNotFound(true); setLoading(false); return }

    const load = async () => {
      const session = await sessionDB.get(sessionId)
      if (!session) { setNotFound(true); setLoading(false); return }

      // Обновляем lastActive
      await sessionDB.save({ ...session, lastActive: Date.now() })

      const course = await courseDB.get(session.courseId)
      if (!course) { setNotFound(true); setLoading(false); return }

      const foundLab = course.labs.find(l => l.id === session.labId)
      if (!foundLab) { setNotFound(true); setLoading(false); return }

      setLab(foundLab)
      setLoading(false)
    }

    load()
  }, [sessionId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Загрузка сессии...</Typography>
      </Box>
    )
  }

  if (notFound || !lab || !sessionId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">Сессия не найдена</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Возможно, она была удалена или ссылка устарела
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>На главную</Button>
      </Box>
    )
  }

  return (
    <Workspace
      roomId={sessionId}
      isOnline={isOnline}
      lab={lab}
    />
  )
}
