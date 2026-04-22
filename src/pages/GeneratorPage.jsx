import { FireOutlined, HistoryOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Modal, Row, Select, Space, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
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
  const { dailyMenu, generateMenu, menuCount, setMenuCount, todayKey, menuHistory } = useLunch()
  const [historyVisible, setHistoryVisible] = useState(false)
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
              <Button icon={<HistoryOutlined />} onClick={() => setHistoryVisible(true)}>
                历史记录
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

      <Modal
        title="历史记录"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={800}
      >
        {menuHistory && menuHistory.length > 0 ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {menuHistory.map((history, index) => {
              const categoryOrder = ['主食', '荤菜', '素菜', '汤', '未分类']
              const sortedDishes = [...history.items].sort((a, b) => {
                const indexA = categoryOrder.indexOf(a.category || '未分类')
                const indexB = categoryOrder.indexOf(b.category || '未分类')
                if (indexA === -1 && indexB === -1) return 0
                if (indexA === -1) return 1
                if (indexB === -1) return -1
                return indexA - indexB
              })

              return (
                <Card key={history.id} size="small">
                  <div className="history-item">
                    <div className="history-header">
                      <Typography.Text strong>
                        第 {menuHistory.length - index} 次生成 - {history.date}
                      </Typography.Text>
                      <Tag color="blue">{history.menuCount || history.items.length} 道菜</Tag>
                    </div>
                    <div className="history-dishes">
                      {sortedDishes.map((dish) => {
                        let tagColor = 'default'
                        let tagStyle = {}

                        // 主食和汤品淡化处理，不做温度颜色区分
                        if (dish.category === '主食' || dish.category === '汤') {
                          tagColor = 'default'
                        } else {
                          // 荤菜和素菜突出显示，并做温度颜色区分
                          tagColor = 'blue'
                          if (dish.servingTemperature === '热菜') {
                            tagStyle = { backgroundColor: '#fff2f0', borderColor: '#ffccc7', color: '#ff4d4f' }
                          } else if (dish.servingTemperature === '冷菜') {
                            tagStyle = { backgroundColor: '#e6f7ff', borderColor: '#91d5ff', color: '#1890ff' }
                          }
                        }

                        return (
                          <Tag key={dish.id} color={tagColor} size="small" style={{ margin: '4px', ...tagStyle }}>
                            {dish.name}
                          </Tag>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )
            })}
          </Space>
        ) : (
          <Empty description="还没有历史记录" />
        )}
      </Modal>
    </Space>
  )
}