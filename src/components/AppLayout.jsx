import {
  AppstoreOutlined,
  FireOutlined,
  MenuOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Grid, Layout, Menu, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Content, Sider } = Layout
const { useBreakpoint } = Grid

const navItems = [
  { key: '/generator', icon: <FireOutlined />, label: '今日菜单' },
  { key: '/library', icon: <UnorderedListOutlined />, label: '菜品库' },
  { key: '/summary', icon: <AppstoreOutlined />, label: '总结' },
]

export default function AppLayout() {
  const screens = useBreakpoint()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/library')) {
      return '/library'
    }
    if (location.pathname.startsWith('/summary')) {
      return '/summary'
    }
    if (location.pathname.startsWith('/generator')) {
      return '/generator'
    }
    return '/generator'
  }, [location.pathname])

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={navItems}
      onClick={({ key }) => {
        navigate(key)
        setDrawerOpen(false)
      }}
    />
  )

  return (
    <Layout className="app-shell">
      {screens.md ? (
        <Sider width={260} className="app-sider" theme="light">
          <div className="brand-block">
            <Typography.Title level={3}>Lunch Maven</Typography.Title>
            <Typography.Title level={5} className="brand-slogan">
              告别觅食烦恼，邂逅美味预言
            </Typography.Title>
            <Typography.Paragraph>
              帮你管理常做菜品，并为今天快速生成一份菜单建议。
            </Typography.Paragraph>
          </div>
          {menu}
        </Sider>
      ) : (
        <Drawer
          title="Lunch Maven"
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          bodyStyle={{ padding: 0 }}
        >
          {menu}
        </Drawer>
      )}

      <Layout>
        <Header className="app-header">
          <Space align="center" size="middle">
            {!screens.md ? (
              <Button
                aria-label="打开导航"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            ) : null}
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                今天吃什么，打开就能决定
              </Typography.Title>
              <Typography.Text type="secondary" className="header-subtitle">
                Stop Wondering, Start Dining.
              </Typography.Text>
            </div>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
