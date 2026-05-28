import { Suspense, lazy } from 'react'
import { ConfigProvider, Spin, theme } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GeneratorPage = lazy(() => import('./pages/GeneratorPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          borderRadius: 12,
          colorBgBase: '#050810',
          colorBgContainer: 'rgba(9, 14, 28, 0.92)',
          colorBorder: 'rgba(94, 225, 255, 0.22)',
          colorInfo: '#1fe3ff',
          colorPrimary: '#1fe3ff',
          colorSuccess: '#2afcb8',
          colorText: '#e7f6ff',
          colorTextSecondary: 'rgba(199, 226, 244, 0.68)',
          fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <ErrorBoundary>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/generator"
              element={
                <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                  <GeneratorPage />
                </Suspense>
              }
            />
            <Route
              path="/"
              element={<Navigate to="/generator" replace />}
            />
            <Route
              path="/summary"
              element={
                <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/library"
              element={
                <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                  <LibraryPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </ConfigProvider>
  )
}
