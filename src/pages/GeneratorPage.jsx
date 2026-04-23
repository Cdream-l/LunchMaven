import { FireOutlined, HistoryOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Empty, Input, Modal, Row, Select, Space, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useLunch } from '../context/LunchContext'

const { TextArea } = Input
const CATEGORY_ORDER = ['主食', '荤菜', '素菜', '汤', '未分类']

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
  const {
    dailyMenu,
    generateMenu,
    lastMenuRequest,
    menuCount,
    menuHistory,
    menuRequest,
    requestAnalysis,
    setMenuCount,
    setMenuRequest,
    todayKey,
  } = useLunch()
  const [historyVisible, setHistoryVisible] = useState(false)

  const recentMenuHistory = useMemo(() => menuHistory.slice(0, 10), [menuHistory])

  const groupedMenu = useMemo(
    () =>
      dailyMenu.items.reduce((groups, dish) => {
        const category = dish.category || '未分类'

        if (!groups[category]) {
          groups[category] = []
        }

        groups[category].push(dish)
        return groups
      }, {}),
    [dailyMenu.items],
  )

  const sortedCategories = useMemo(
    () =>
      Object.keys(groupedMenu).sort((left, right) => {
        const leftIndex = CATEGORY_ORDER.indexOf(left)
        const rightIndex = CATEGORY_ORDER.indexOf(right)

        if (leftIndex === -1 && rightIndex === -1) {
          return left.localeCompare(right, 'zh-CN')
        }

        if (leftIndex === -1) {
          return 1
        }

        if (rightIndex === -1) {
          return -1
        }

        return leftIndex - rightIndex
      }),
    [groupedMenu],
  )

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <Card>
        <Row gutter={[16, 16]} align="top" justify="space-between">
          <Col xs={24} lg={13}>
            <Typography.Title level={2}>今日菜单</Typography.Title>
            <Typography.Paragraph>
              可以直接用自然语言描述人数、口味和忌口。系统会优先按你的描述匹配菜品，匹配不足时再回退到原有的均衡生成逻辑。
            </Typography.Paragraph>
          </Col>
          <Col xs={24} lg={11}>
            <Space wrap className="generator-actions">
              <Select
                value={menuCount}
                options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `${value} 道菜` }))}
                onChange={setMenuCount}
                style={{ minWidth: 120 }}
                disabled={requestAnalysis.hasQuantityIntent}
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

        <div className="menu-request-block">
          <div className="menu-request-header">
            <Typography.Text strong>自由描述</Typography.Text>
            <Space wrap size={[8, 8]}>
              {lastMenuRequest ? (
                <Button size="small" onClick={() => setMenuRequest(lastMenuRequest)}>
                  插入上次描述
                </Button>
              ) : null}
              {menuRequest ? (
                <Button size="small" type="text" onClick={() => setMenuRequest('')}>
                  清空
                </Button>
              ) : null}
            </Space>
          </div>
          <TextArea
            value={menuRequest}
            onChange={(event) => setMenuRequest(event.target.value)}
            rows={4}
            maxLength={200}
            placeholder="例如：5个人，少油，不吃面条，忌口羊肉，最好有汤；或：4个人，多点素菜，不要辣，别来汤，下饭一点"
            className="menu-request-input"
          />
          <Space wrap size={[8, 8]}>
            <Tag color={requestAnalysis.hasQuantityIntent ? 'processing' : 'default'}>
              {requestAnalysis.hasQuantityIntent ? '数量以自由描述为准' : '数量以“几道菜”选项为准'}
            </Tag>
            {lastMenuRequest ? <Tag>上次描述已保存</Tag> : null}
            {requestAnalysis.summary ? <Tag color="gold">{requestAnalysis.summary}</Tag> : null}
          </Space>
          {requestAnalysis.hasRequest ? (
            <Alert
              type="info"
              showIcon
              className="menu-request-alert"
              message={
                requestAnalysis.hasQuantityIntent
                  ? '检测到人数或菜数要求，已覆盖上方“几道菜”选项。'
                  : '未检测到数量要求，仍按上方“几道菜”选项控制生成规模。'
              }
            />
          ) : null}
        </div>
      </Card>

      <Card
        title={dailyMenu.date === todayKey() ? '今天的菜单结果' : '还没有今天的结果'}
        extra={<Tag color="gold">{dailyMenu.date}</Tag>}
      >
        {dailyMenu.requestMeta?.summary ? (
          <Alert
            type="success"
            showIcon
            className="menu-request-result"
            message={`本次生成依据：${dailyMenu.requestMeta.summary}`}
          />
        ) : null}

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
                                  <Typography.Text strong className="dish-name-text">
                                    {dish.name}
                                  </Typography.Text>
                                </div>
                                <Tag color={caloriesMeta.color} size="small">
                                  {dish.calories} kcal
                                </Tag>
                              </div>
                              <div className="dish-tags">
                                <Space size={4} wrap>
                                  {dish.tags && dish.tags.length ? (
                                    dish.tags.map((tag) => (
                                      <Tag key={`${dish.id}-${tag}`} size="small">
                                        {tag}
                                      </Tag>
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

      <Modal title="历史记录（最近 10 次）" open={historyVisible} onCancel={() => setHistoryVisible(false)} footer={null} width={800}>
        {recentMenuHistory.length > 0 ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {recentMenuHistory.map((history, index) => {
              const sortedDishes = [...history.items].sort((left, right) => {
                const leftIndex = CATEGORY_ORDER.indexOf(left.category || '未分类')
                const rightIndex = CATEGORY_ORDER.indexOf(right.category || '未分类')

                if (leftIndex === -1 && rightIndex === -1) {
                  return 0
                }

                if (leftIndex === -1) {
                  return 1
                }

                if (rightIndex === -1) {
                  return -1
                }

                return leftIndex - rightIndex
              })

              return (
                <Card key={history.id} size="small">
                  <div className="history-item">
                    <div className="history-header">
                      <Typography.Text strong>
                        第 {menuHistory.length - index} 次生成 - {history.date}
                      </Typography.Text>
                      <Tag color="blue">
                        {history.requestMeta?.requestedDishCount || history.menuCount || history.items.length} 道菜
                      </Tag>
                    </div>
                    {history.requestMeta?.summary ? (
                      <Typography.Text type="secondary">依据：{history.requestMeta.summary}</Typography.Text>
                    ) : null}
                    <div className="history-dishes">
                      {sortedDishes.map((dish) => {
                        let tagColor = 'default'
                        let tagStyle = {}

                        if (dish.category === '主食' || dish.category === '汤') {
                          tagColor = 'default'
                        } else {
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
