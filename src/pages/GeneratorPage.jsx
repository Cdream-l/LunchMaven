import { FireOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Row, Select, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useLunch } from '../context/LunchContext'

function getCaloriesLevelMeta(calories) {
  if (calories <= 220) {
    return { color: 'green', label: '低热量' }
  }

  if (calories <= 450) {
    return { color: 'gold', label: '中热量' }
  }

  return { color: 'red', label: '高热量' }
}

export default function GeneratorPage() {
  const { dailyMenu, generateMenu, menuCount, setMenuCount, todayKey } = useLunch()
  const groupedMenu = useMemo(() => {
    return dailyMenu.items.reduce((groups, dish) => {
      const category = dish.category || '未分类'

      if (!groups[category]) {
        groups[category] = []
      }

      groups[category].push(dish)
      return groups
    }, {})
  }, [dailyMenu.items])

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
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {Object.entries(groupedMenu).map(([category, dishes]) => (
              <section key={category} className="menu-category-section">
                <div className="menu-category-header">
                  <Space wrap>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {category}
                    </Typography.Title>
                    <Tag color="blue">{dishes.length} 道</Tag>
                  </Space>
                </div>

                <Row gutter={[16, 16]}>
                  {dishes.map((dish) => {
                    const caloriesMeta = getCaloriesLevelMeta(dish.calories)

                    return (
                      <Col xs={24} md={12} xl={8} key={dish.id}>
                        <Card className="menu-result-card" bordered={false}>
                          <Space wrap>
                            <Tag color="geekblue">{dish.servingTemperature || '待定温度'}</Tag>
                            <Tag color={caloriesMeta.color}>
                              {dish.calories} kcal · {caloriesMeta.label}
                            </Tag>
                            {caloriesMeta.label === '高热量' ? <Tag color="volcano">高热量提醒</Tag> : null}
                          </Space>
                          <Typography.Title level={4}>{dish.name}</Typography.Title>
                          <Typography.Paragraph type="secondary">{dish.category}</Typography.Paragraph>
                          <Space wrap>
                            {dish.tags.length ? (
                              dish.tags.map((tag) => <Tag key={`${dish.id}-${tag}`}>{tag}</Tag>)
                            ) : (
                              <Tag>待补充标签</Tag>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </section>
            ))}
          </Space>
        ) : (
          <Empty description="还没有可生成的菜品，先去菜品库添加内容吧" />
        )}
      </Card>
    </Space>
  )
}
