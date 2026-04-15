import React, { useState, useRef } from 'react'
import {
  Box, Typography, IconButton, Tooltip, List, ListItemButton,
  ListItemText, ListItemIcon, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

const FILE_ICONS: Record<string, string> = {
  py: '🐍', js: '🟨', ts: '🔷', lua: '🌙',
  sql: '🗄️', java: '☕', json: '{}', md: '📝',
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop() ?? ''
  return FILE_ICONS[ext] ?? '📄'
}

interface Props {
  fileList: string[]
  activeFile: string
  readOnlyFiles?: string[]
  onSelect: (path: string) => void
  onAdd: (path: string) => void
  onDelete: (path: string) => void
}

export default function FileTree({
  fileList, activeFile, readOnlyFiles = [],
  onSelect, onAdd, onDelete,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameError, setNameError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startAdding = () => {
    setAdding(true)
    setNewName('')
    setNameError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const confirmAdd = () => {
    const name = newName.trim()
    if (!name) { setNameError('Введите имя'); return }
    if (!/^[\w\-. ]+$/.test(name)) { setNameError('Недопустимые символы'); return }
    if (fileList.includes(name)) { setNameError('Файл уже существует'); return }
    onAdd(name)
    setAdding(false)
    setNewName('')
  }

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setNameError('')
  }

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: '100%', borderRight: '1px solid #2a2a2a',
      bgcolor: '#0d0d0d', minWidth: 0,
    }}>
      {/* Заголовок */}
      <Box sx={{
        px: 1.5, py: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #2a2a2a', flexShrink: 0,
      }}>
        <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
          Файлы
        </Typography>
        <Tooltip title="Новый файл">
          <IconButton size="small" onClick={startAdding} sx={{ color: '#555', '&:hover': { color: '#fff' } }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Список файлов */}
      <List dense disablePadding sx={{ flexGrow: 1, overflow: 'auto' }}>
        {fileList.map(path => {
          const isActive = path === activeFile
          const isReadOnly = readOnlyFiles.includes(path)
          return (
            <ListItemButton
              key={path}
              selected={isActive}
              onClick={() => onSelect(path)}
              sx={{
                px: 1.5, py: 0.5,
                borderLeft: isActive ? '2px solid #2196f3' : '2px solid transparent',
                '&.Mui-selected': { bgcolor: '#1a2a3a', '&:hover': { bgcolor: '#1a2a3a' } },
                '&:hover .delete-btn': { opacity: 1 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, fontSize: 14 }}>
                {getFileIcon(path)}
              </ListItemIcon>
              <ListItemText
                primary={path}
                primaryTypographyProps={{
                  variant: 'body2',
                  noWrap: true,
                  sx: { color: isActive ? '#90caf9' : '#bbb', fontSize: 13 },
                }}
              />
              {!isReadOnly && (
                <Tooltip title="Удалить файл">
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={e => {
                      e.stopPropagation()
                      if (fileList.length === 1) return // нельзя удалить последний
                      if (confirm(`Удалить файл "${path}"?`)) onDelete(path)
                    }}
                    sx={{
                      opacity: 0, transition: 'opacity 0.15s',
                      color: '#555', '&:hover': { color: '#f44336' },
                      p: 0.25,
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemButton>
          )
        })}

        {/* Форма добавления нового файла */}
        {adding && (
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="main.py"
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAdd()
                if (e.key === 'Escape') cancelAdd()
              }}
              error={!!nameError}
              helperText={nameError}
              inputProps={{ style: { fontSize: 12, padding: '4px 8px', fontFamily: 'monospace' } }}
              sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#1a1a1a' } }}
            />
            <IconButton size="small" onClick={confirmAdd} sx={{ color: '#4caf50' }}>
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={cancelAdd} sx={{ color: '#666' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </List>
    </Box>
  )
}
