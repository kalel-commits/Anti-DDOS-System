import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorMessage = ({ 
  message = 'An error occurred', 
  onRetry, 
  fullScreen = false,
  details = null 
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }),
      }}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6" color="error" align="center">
        {message}
      </Typography>
      {details && (
        <Typography variant="body2" color="text.secondary" align="center">
          {details}
        </Typography>
      )}
      {onRetry && (
        <Button
          variant="contained"
          color="primary"
          onClick={onRetry}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      )}
    </Box>
  );

  return fullScreen ? (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {content}
    </Box>
  ) : (
    content
  );
};

export default ErrorMessage; 