import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useLunch } from '../context/LunchContext'

export default function DashboardPage() {
  const { dailyMenu, generateMenu, resetLibrary, stats } = useLunch()

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <Card className="hero-banner">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={15}>
            <Typography.Title level={1} className="hero-title">
              总结
            </Typography.Title>
            <Typography.Paragraph className="hero-desc">
              这里集中展示当前菜品库和今日菜单的摘要信息，方便快速回看整体情况。
            </Typography.Paragraph>
            <Space wrap>
              <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => generateMenu(true)}>
                重新随机今天菜单
              </Button>
              <Button size="large" onClick={resetLibrary}>
                恢复示例菜品
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={9}>
            <Card bordered={false} className="hero-side-card">
              <Typography.Title level={5}>今日菜单摘要</Typography.Title>
              <List
                dataSource={dailyMenu.items}
                locale={{ emptyText: '还没有菜品，先去菜品库添加几道吧' }}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>
                        {index + 1}. {item.name}
                      </Typography.Text>
                      <Typography.Text type="secondary">{item.category}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="菜品总数" value={stats.total} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="分类数量" value={stats.categories} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="快手菜数量" value={stats.quick} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="下一步"
            extra={
              <Link to="/generator">
                前往今日菜单 <ArrowRightOutlined />
              </Link>
            }
          >
            <Typography.Paragraph>
              在“今日菜单”页选择今天要抽取的菜品数量，并查看当前日期对应的随机结果。
            </Typography.Paragraph>
            <Tag color="orange">更适合每天打开即用</Tag>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="维护菜品库"
            extra={
              <Link to="/library">
                打开菜品库 <ArrowRightOutlined />
              </Link>
            }
          >
            <Typography.Paragraph>
              在“菜品库”页通过表单录入、搜索筛选和删除，管理自己的完整候选菜单。
            </Typography.Paragraph>
            <Tag color="blue">适合集中整理数据</Tag>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
