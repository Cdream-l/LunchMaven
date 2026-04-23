import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Alert, Button, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLunch } from '../context/LunchContext'

echarts.use([BarChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, PieChart, RadarChart, RadarComponent, TooltipComponent])

function countBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item)

    if (!key) {
      return accumulator
    }

    accumulator.set(key, (accumulator.get(key) || 0) + 1)
    return accumulator
  }, new Map())
}

function getTopEntry(map) {
  const entries = [...map.entries()].sort((left, right) => right[1] - left[1])
  return entries[0] || null
}

function formatAverage(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0'
}

function buildInsightCards(menuHistory) {
  if (!menuHistory.length) {
    return []
  }

  const allDishes = menuHistory.flatMap((history) => history.items)
  const categoryCounts = countBy(allDishes, (dish) => dish.category || '未分类')
  const dishCounts = countBy(allDishes, (dish) => dish.name)
  const requestCounts = countBy(
    menuHistory.filter((history) => history.requestMeta?.summary),
    (history) => history.requestMeta.summary,
  )
  const topCategory = getTopEntry(categoryCounts)
  const topDish = getTopEntry(dishCounts)
  const topRequest = getTopEntry(requestCounts)
  const averageCalories =
    allDishes.reduce((total, dish) => total + (Number(dish.calories) || 0), 0) / Math.max(allDishes.length, 1)

  return [
    {
      label: '生成次数',
      value: String(menuHistory.length),
      accent: 'violet',
      detail: '最近留存的历史菜单快照',
    },
    {
      label: '平均菜数',
      value: formatAverage(
        menuHistory.reduce((total, history) => total + history.items.length, 0) / Math.max(menuHistory.length, 1),
      ),
      accent: 'amber',
      detail: '每次生成的平均上桌数量',
    },
    {
      label: '高频类目',
      value: topCategory ? topCategory[0] : '暂无',
      accent: 'cyan',
      detail: topCategory ? `共出现 ${topCategory[1]} 次` : '等待更多历史数据',
    },
    {
      label: '热度菜品',
      value: topDish ? topDish[0] : '暂无',
      accent: 'rose',
      detail: topDish ? `历史中出现 ${topDish[1]} 次` : '等待更多历史数据',
    },
    {
      label: '平均热量',
      value: `${Math.round(averageCalories)} kcal`,
      accent: 'lime',
      detail: '基于历史菜单所有菜品估算',
    },
    {
      label: '常见需求',
      value: topRequest ? topRequest[0] : '默认随机',
      accent: 'blue',
      detail: topRequest ? `命中 ${topRequest[1]} 次` : '还没有带条件的生成记录',
    },
  ]
}

function useEChart(ref, option) {
  useEffect(() => {
    if (!ref.current || !option) {
      return undefined
    }

    const chart = echarts.init(ref.current)
    chart.setOption(option)

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [option, ref])
}

function ChartPanel({ title, hint, option, className = '' }) {
  const chartRef = useRef(null)
  useEChart(chartRef, option)

  return (
    <Card className={`analytics-card ${className}`.trim()}>
      <div className="analytics-card-header">
        <div>
          <Typography.Title level={4}>{title}</Typography.Title>
          <Typography.Text type="secondary">{hint}</Typography.Text>
        </div>
      </div>
      <div ref={chartRef} className="analytics-chart" />
    </Card>
  )
}

export default function DashboardPage() {
  const { dailyMenu, generateMenu, menuHistory, requestAnalysis, stats } = useLunch()

  const analytics = useMemo(() => {
    const orderedHistory = [...menuHistory].reverse()
    const allDishes = orderedHistory.flatMap((history) => history.items)
    const topDishes = [...countBy(allDishes, (dish) => dish.name).entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
    const categoryCounts = [...countBy(allDishes, (dish) => dish.category || '未分类').entries()]
      .sort((left, right) => right[1] - left[1])
    const tagCounts = [...countBy(allDishes.flatMap((dish) => dish.tags || []), (tag) => tag).entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
    const temperatureCounts = [...countBy(allDishes, (dish) => dish.servingTemperature || '待定').entries()]
    const trendRows = orderedHistory.map((history, index) => {
      const averageCalories =
        history.items.reduce((total, dish) => total + (Number(dish.calories) || 0), 0) / Math.max(history.items.length, 1)

      return {
        label: `第${index + 1}次`,
        date: history.date,
        count: history.items.length,
        averageCalories: Math.round(averageCalories),
      }
    })

    return {
      topDishes,
      categoryCounts,
      tagCounts,
      temperatureCounts,
      trendRows,
      insightCards: buildInsightCards(orderedHistory),
    }
  }, [menuHistory])

  const trendOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#475569' } },
      grid: { left: 24, right: 24, top: 40, bottom: 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: analytics.trendRows.map((row) => row.label),
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '菜数',
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
        },
        {
          type: 'value',
          name: '平均热量',
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '菜数',
          type: 'line',
          smooth: true,
          data: analytics.trendRows.map((row) => row.count),
          lineStyle: { width: 4, color: '#f97316' },
          itemStyle: { color: '#ea580c' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(249, 115, 22, 0.32)' },
              { offset: 1, color: 'rgba(249, 115, 22, 0.02)' },
            ]),
          },
        },
        {
          name: '平均热量',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 24,
          data: analytics.trendRows.map((row) => row.averageCalories),
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: '#0f766e',
          },
        },
      ],
    }),
    [analytics.trendRows],
  )

  const categoryOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      grid: { left: 24, right: 24, top: 16, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
      },
      yAxis: {
        type: 'category',
        data: analytics.categoryCounts.map(([name]) => name),
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: analytics.categoryCounts.map(([, value]) => value),
          barWidth: 18,
          itemStyle: {
            borderRadius: 999,
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: '#fdba74' },
              { offset: 1, color: '#f97316' },
            ]),
          },
          label: { show: true, position: 'right', color: '#475569' },
        },
      ],
    }),
    [analytics.categoryCounts],
  )

  const topDishOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['44%', '72%'],
          center: ['50%', '54%'],
          label: { color: '#334155', formatter: '{b}\n{c}次' },
          labelLine: { length: 10, length2: 8 },
          itemStyle: { borderColor: '#fff', borderWidth: 3 },
          data: analytics.topDishes.map(([name, value], index) => ({
            name,
            value,
            itemStyle: {
              color: ['#fb7185', '#f97316', '#facc15', '#34d399', '#38bdf8', '#818cf8', '#c084fc', '#2dd4bf'][index % 8],
            },
          })),
        },
      ],
    }),
    [analytics.topDishes],
  )

  const tagRadarOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {},
      radar: {
        radius: '62%',
        splitNumber: 4,
        splitLine: { lineStyle: { color: 'rgba(59, 130, 246, 0.18)' } },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.02)', 'rgba(59, 130, 246, 0.04)'],
          },
        },
        indicator: analytics.tagCounts.map(([name, value]) => ({
          name,
          max: Math.max(value + 1, 4),
        })),
        axisName: { color: '#334155' },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: analytics.tagCounts.map(([, value]) => value),
              areaStyle: { color: 'rgba(59, 130, 246, 0.22)' },
              lineStyle: { color: '#2563eb', width: 3 },
              itemStyle: { color: '#1d4ed8' },
            },
          ],
        },
      ],
    }),
    [analytics.tagCounts],
  )

  const temperatureOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['34%', '68%'],
          avoidLabelOverlap: false,
          label: { formatter: '{b}\n{d}%', color: '#334155' },
          data: analytics.temperatureCounts.map(([name, value]) => ({
            name,
            value,
            itemStyle: {
              color:
                name === '热菜' ? '#ef4444' :
                name === '冷菜' ? '#06b6d4' :
                '#94a3b8',
            },
          })),
        },
      ],
    }),
    [analytics.temperatureCounts],
  )

  return (
    <Space direction="vertical" size={24} className="page-stack">
      <Card className="analytics-hero">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} xl={15}>
            <Tag className="analytics-kicker">Menu Intelligence</Tag>
            <Typography.Title level={1} className="analytics-title">
              历史菜单分析舱
            </Typography.Title>
            <Typography.Paragraph className="analytics-description">
              这里不再只是当天摘要，而是把过去的生成记录拆成趋势、偏好、类目和高频菜品，帮助你看清这套菜单系统最近在怎么“做决策”。
            </Typography.Paragraph>
            <Space wrap>
              <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => generateMenu(true)}>
                再生成一轮观察变化
              </Button>
              <Link to="/generator">
                <Button size="large">
                  去今日菜单 <ArrowRightOutlined />
                </Button>
              </Link>
              <Link to="/library">
                <Button size="large">
                  去菜品库 <ArrowRightOutlined />
                </Button>
              </Link>
            </Space>
            {requestAnalysis.summary ? (
              <Alert
                type="info"
                showIcon
                className="analytics-inline-alert"
                message={`当前自由描述偏好：${requestAnalysis.summary}`}
              />
            ) : null}
          </Col>
          <Col xs={24} xl={9}>
            <div className="analytics-hero-aside">
              <div className="analytics-scan-card">
                <Typography.Text className="analytics-scan-label">今日菜单</Typography.Text>
                <Typography.Title level={3}>{dailyMenu.items.length || 0} 道</Typography.Title>
                <Typography.Text type="secondary">
                  {dailyMenu.items.length
                    ? dailyMenu.items.map((item) => item.name).slice(0, 4).join(' / ')
                    : '还没有可分析的当日菜单'}
                </Typography.Text>
              </div>
              <div className="analytics-scan-card analytics-scan-card-secondary">
                <Typography.Text className="analytics-scan-label">菜品底库</Typography.Text>
                <Typography.Title level={3}>{stats.total} 道</Typography.Title>
                <Typography.Text type="secondary">
                  覆盖 {stats.categories} 个分类，其中快手菜 {stats.quick} 道
                </Typography.Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {!menuHistory.length ? (
        <Card className="analytics-empty-card">
          <Empty description="还没有历史生成记录，先去“今日菜单”多生成几次，这里就会开始长出分析图表。" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {analytics.insightCards.map((card) => (
              <Col xs={24} sm={12} xl={8} key={card.label}>
                <Card className={`insight-card accent-${card.accent}`}>
                  <Typography.Text className="insight-label">{card.label}</Typography.Text>
                  <Typography.Title level={3}>{card.value}</Typography.Title>
                  <Typography.Text type="secondary">{card.detail}</Typography.Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartPanel
                title="历史波动"
                hint="查看最近几次生成的总菜数和平均热量走势"
                option={trendOption}
                className="analytics-panel-tall"
              />
            </Col>
            <Col xs={24} xl={10}>
              <ChartPanel
                title="类目重心"
                hint="过去菜单里，系统更常推哪些类目"
                option={categoryOption}
                className="analytics-panel-tall"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <ChartPanel
                title="高频菜品"
                hint="最近菜单里反复出现的菜，能直接看出推荐偏好"
                option={topDishOption}
              />
            </Col>
            <Col xs={24} lg={12}>
              <ChartPanel
                title="标签画像"
                hint="标签雷达能快速看出这段时间菜单偏清淡、下饭还是快手"
                option={analytics.tagCounts.length ? tagRadarOption : null}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <ChartPanel
                title="冷热分布"
                hint="热菜和冷菜占比，用来观察菜单层次是否单一"
                option={temperatureOption}
              />
            </Col>
            <Col xs={24} lg={14}>
              <Card className="analytics-card analytics-feed-card">
                <div className="analytics-card-header">
                  <div>
                    <Typography.Title level={4}>分析摘要</Typography.Title>
                    <Typography.Text type="secondary">把图表信号压缩成几条更容易直接理解的话</Typography.Text>
                  </div>
                </div>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {analytics.insightCards.slice(2).map((card) => (
                    <div key={card.label} className="analytics-feed-item">
                      <Tag>{card.label}</Tag>
                      <Typography.Text strong>{card.value}</Typography.Text>
                      <Typography.Text type="secondary">{card.detail}</Typography.Text>
                    </div>
                  ))}
                  {menuHistory[0]?.requestMeta?.summary ? (
                    <div className="analytics-feed-item">
                      <Tag color="processing">最近一次生成条件</Tag>
                      <Typography.Text strong>{menuHistory[0].requestMeta.summary}</Typography.Text>
                      <Typography.Text type="secondary">可以和上面的趋势图一起看约束是否明显改变了结果。</Typography.Text>
                    </div>
                  ) : null}
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Space>
  )
}
