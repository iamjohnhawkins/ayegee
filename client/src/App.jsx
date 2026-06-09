import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './hooks/useToast.jsx';
import { Layout } from './components/layout/Layout';

// Pages
import { Dashboard }          from './pages/Dashboard';
import { Applications }       from './pages/Applications';
import { ApplicationGroups }  from './pages/ApplicationGroups';
import { FTEs }               from './pages/FTEs';
import { Portfolios }         from './pages/Portfolios';
import { ADCs }               from './pages/ADCs';
import { CTB }                from './pages/CTB';
import { CTBProjects }        from './pages/CTBProjects';
import { CTBProjectDetail }   from './pages/CTBProjectDetail';
import { FTEAllocation }      from './pages/FTEAllocation';
import { FTESummary }         from './pages/FTESummary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index                     element={<Dashboard />} />
              <Route path="applications"       element={<Applications />} />
              <Route path="application-groups" element={<ApplicationGroups />} />
              <Route path="ftes"               element={<FTEs />} />
              <Route path="portfolios"         element={<Portfolios />} />
              <Route path="adcs"               element={<ADCs />} />
              <Route path="ctb"                element={<CTB />} />
              <Route path="ctb-projects"       element={<CTBProjects />} />
              <Route path="ctb-projects/:id"   element={<CTBProjectDetail />} />
              <Route path="fte-allocation"     element={<FTEAllocation />} />
              <Route path="fte-summary"        element={<FTESummary />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
