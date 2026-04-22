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

  const sortedCategories = useMemo(() => {
    const categoryOrder = ['主食', '荤菜', '素菜', '汤', '未分类']
    return Object.keys(groupedMenu).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a)
      const indexB = categoryOrder.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }, [groupedMenu])

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={14}>
            <Typography.Title level={2}>今日菜单</Typography.Title>
            <Typography.Paragraph>
              选择菜品数量后，系统会生成对应数量的荤菜+素菜，再自动添加1道主食和1道汤品，确保营养均衡。
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
          <div className="menu-layout-container">
            <Row gutter={[16, 0]} className="menu-categories-row">
              {sortedCategories.map((category) => {
                const dishes = groupedMenu[category]
                return (
                  <Col key={category} xs={24} sm={12} md={8} lg={6} className="menu-category-col">
                    <div className="menu-category-card">
                      <div className="menu-category-title">
                        <Typography.Title level={4} style={{ margin: 0 }}>
                          {category}
                        </Typography.Title>
                        <div className="category-count">
                          <span className="count-number">{dishes.length}</span>
                          <span className="count-label">道</span>
                        </div>
                      </div>
                      <div className="menu-dishes-list">
                        {dishes.map((dish) => {
                          const caloriesMeta = getCaloriesLevelMeta(dish.calories)

                          return (
                            <div key={dish.id} className="menu-dish-item">
                              <div className="dish-info-header">
                                <div className="dish-name-section">
                                  <Tag color={dish.servingTemperature === '热菜' ? 'red' : dish.servingTemperature === '冷菜' ? 'cyan' : 'default'}>
                                    {dish.servingTemperature === '热菜' ? '热' : dish.servingTemperature === '冷菜' ? '冷' : '待定'}
                                  </Tag>
                                  <Typography.Text strong className="dish-name-text">{dish.name}</Typography.Text>
                                </div>
                                <Tag color={caloriesMeta.color} size="small">
                                  {dish.calories} kcal
                                </Tag>
                              </div>
                              <div className="dish-tags">
                                <Space size={4} wrap>
                                  {dish.tags && dish.tags.length ? (
                                    dish.tags.map((tag) => (
                                      <Tag key={`${dish.id}-${tag}`} size="small">{tag}</Tag>
                                    ))
                                  ) : (
                                    <Tag size="small">待补充标签</Tag>
                                  )}
                                </Space>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Col>
                )
              })}
            </Row>
          </div>
        ) : (
          <Empty description="还没有可生成的菜品，先去菜品库添加内容吧" />
        )}
      </Card>
    </Space>
  )
}