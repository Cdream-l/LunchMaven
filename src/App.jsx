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
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 12,
          colorBgBase: '#eef8ff',
          colorBgContainer: 'rgba(255, 255, 255, 0.92)',
          colorBorder: 'rgba(43, 132, 210, 0.2)',
          colorInfo: '#2f74c0',
          colorPrimary: '#2f74c0',
          colorSuccess: '#138a74',
          colorText: '#102033',
          colorTextSecondary: 'rgba(41, 61, 86, 0.68)',
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
