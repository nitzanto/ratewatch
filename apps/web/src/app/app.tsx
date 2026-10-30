import { HealthStatus } from '@/components/business/health-status';
import { Container, Typography } from '@mui/material';

const App = () => (
  <Container sx={{ py: 4 }}>
    <Typography variant="h4" component="h1" gutterBottom>
      ratewatch
    </Typography>
    <HealthStatus />
  </Container>
);

export default App;
