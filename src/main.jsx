import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import App from './App'
import { LunchProvider } from './context/LunchContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#d46b08',
            borderRadius: 18,
            colorBgLayout: '#f5efe6',
            colorBgContainer: 'rgba(255,255,255,0.92)',
          },
        }}
      >
        <AntApp>
          <LunchProvider>
            <App />
          </LunchProvider>
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
