import { FireOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Row, Select, Space, Tag, Typography } from 'antd'
import { useLunch } from '../context/LunchContext'

export default function GeneratorPage() {
  const { dailyMenu, generateMenu, menuCount, setMenuCount, todayKey } = useLunch()

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={14}>
            <Typography.Title level={2}>今日菜单</Typography.Title>
            <Typography.Paragraph>
              页面聚焦在“生成”和“查看结果”，不再和录入、筛选等操作混在一起。
            </Typography.Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap className="generator-actions">
              <Select
                value={menuCount}
                options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `${value} 道菜` }))}
                onChange={setMenuCount}
                style={{ minWidth: 120 }}
              />
              <Button type="primary" icon={<FireOutlined />} onClick={() => generateMenu(true)}>
                重新生成
              </Button>
              <Button icon={<SyncOutlined />} onClick={() => generateMenu(false)}>
                沿用当天结果
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={dailyMenu.date === todayKey() ? '今天的菜单结果' : '还没有今天的结果'}
        extra={<Tag color="gold">{dailyMenu.date}</Tag>}
      >
        {dailyMenu.items.length ? (
          <Row gutter={[16, 16]}>
            {dailyMenu.items.map((dish, index) => (
              <Col xs={24} md={12} xl={8} key={dish.id}>
                <Card className="menu-result-card" bordered={false}>
                  <Tag color="geekblue">No. {index + 1}</Tag>
                  <Typography.Title level={4}>{dish.name}</Typography.Title>
                  <Typography.Paragraph type="secondary">{dish.category}</Typography.Paragraph>
                  <Space wrap>
                    {dish.tags.length ? dish.tags.map((tag) => <Tag key={`${dish.id}-${tag}`}>{tag}</Tag>) : <Tag>待补充标签</Tag>}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="还没有可生成的菜品，先去菜品库添加内容吧" />
        )}
      </Card>
    </Space>
  )
}
