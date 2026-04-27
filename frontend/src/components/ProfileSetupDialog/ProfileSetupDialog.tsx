import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, Avatar,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'

interface Props {
  open: boolean
  onConfirm: (username: string) => void
}

export default function ProfileSetupDialog({ open, onConfirm }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = username.trim()
    if (trimmed.length < 2) {
      setError('Имя должно быть не короче 2 символов')
      return
    }
    if (trimmed.length > 32) {
      setError('Имя должно быть не длиннее 32 символов')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
            <PersonIcon fontSize="large" />
          </Avatar>
          <Typography variant="h6" fontWeight="bold">
            Добро пожаловать в В-Лабу
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Введите имя, которое будут видеть другие участники в совместных сессиях
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <TextField
          autoFocus
          fullWidth
          label="Ваше имя"
          placeholder="Например: Иван или dev_23"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          error={!!error}
          helperText={error}
          inputProps={{ maxLength: 32 }}
          sx={{
            '& .MuiOutlinedInput-root': { borderColor: '#333' },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={username.trim().length < 2}
        >
          Начать работу
        </Button>
      </DialogActions>
    </Dialog>
  )
}
