import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useMemo, useRef, useState } from 'react'
import { useLunch } from '../context/LunchContext'
import { CATEGORY_OPTIONS, inferDishProfile, TEMPERATURE_OPTIONS } from '../shared/algorithms/dishProfile'
import { parseDishesMarkdown, serializeDishesToMarkdown } from '../shared/markdown/dishMarkdown'

function getCaloriesLevelMeta(calories) {
  if (calories <= 220) {
    return { color: 'green', label: '低' }
  }

  if (calories <= 450) {
    return { color: 'gold', label: '中' }
  }

  return { color: 'red', label: '高' }
}

export default function LibraryPage() {
  const { addDish, categories, dishes, removeDish, replaceDishes, resetLibrary } = useLunch()
  const [draftName, setDraftName] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [suggestionReady, setSuggestionReady] = useState(false)
  const [detailForm] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const importInputRef = useRef(null)

  const filteredDishes = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === '全部' || dish.category === activeCategory
      const matchesKeyword =
        !keyword ||
        dish.name.toLowerCase().includes(keyword) ||
        dish.category.toLowerCase().includes(keyword) ||
        dish.servingTemperature.toLowerCase().includes(keyword) ||
        String(dish.calories).includes(keyword) ||
        dish.tags.some((tag) => tag.toLowerCase().includes(keyword))

      return matchesCategory && matchesKeyword
    })
  }, [activeCategory, dishes, search])

  const columns = [
    {
      title: '菜品',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.category} · {record.servingTemperature}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '热量',
      dataIndex: 'calories',
      key: 'calories',
      width: 130,
      render: (value) => {
        const caloriesMeta = getCaloriesLevelMeta(value)
        return <Tag color={caloriesMeta.color}>{value} kcal · {caloriesMeta.label}</Tag>
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <Space wrap>
          {tags.length ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Tag>无标签</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="删除菜品"
          description={`确定删除“${record.name}”吗？`}
          okText="删除"
          cancelText="取消"
          onConfirm={() => removeDish(record.id)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  function handlePrefill() {
    const name = draftName.trim()

    if (!name) {
      messageApi.warning('请先输入菜品名称')
      return
    }

    const suggestion = inferDishProfile(name)

    detailForm.setFieldsValue({
      calories: suggestion.calories,
      category: suggestion.category,
      name: suggestion.name,
      servingTemperature: suggestion.servingTemperature,
      tags: suggestion.tags,
    })
    setSuggestionReady(true)
    messageApi.success('已根据菜名预填其它信息')
  }

  function handleFinish(values) {
    addDish(values)
    detailForm.resetFields()
    setDraftName('')
    setSuggestionReady(false)
    messageApi.success('菜品已加入菜品库')
  }

  function handleExportMarkdown() {
    const markdown = serializeDishesToMarkdown(dishes)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `lunch-maven-dishes-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
    messageApi.success('菜品库已导出为 Markdown 文件')
  }

  function triggerImport() {
    importInputRef.current?.click()
  }

  async function handleImportMarkdown(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const importedDishes = parseDishesMarkdown(content)

      replaceDishes(importedDishes)
      messageApi.success(`已导入 ${importedDishes.length} 道菜`)
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '导入失败，请检查 Markdown 格式')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <Space direction="vertical" size={24} className="page-stack">
      {contextHolder}
      <input
        ref={importInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        hidden
        onChange={handleImportMarkdown}
      />

      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={14}>
            <Typography.Title level={2}>菜品库管理</Typography.Title>
            <Typography.Paragraph>
              支持导出为 Markdown 批量编辑，也支持从 Markdown 导回菜品库。
            </Typography.Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap>
              <Input
                allowClear
                placeholder="搜索菜名 / 分类 / 温度 / 热量 / 标签"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: 260 }}
              />
              <Select
                value={activeCategory}
                options={categories.map((category) => ({ value: category, label: category }))}
                onChange={setActiveCategory}
                style={{ width: 140 }}
              />
              <Button icon={<DownloadOutlined />} onClick={handleExportMarkdown}>
                导出 Markdown
              </Button>
              <Button icon={<UploadOutlined />} onClick={triggerImport}>
                导入 Markdown
              </Button>
              <Button icon={<ReloadOutlined />} onClick={resetLibrary}>
                恢复示例
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="新增菜品">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Input
                value={draftName}
                placeholder="先输入菜品名称，例如：红烧排骨"
                onChange={(event) => setDraftName(event.target.value)}
                onPressEnter={handlePrefill}
              />
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={handlePrefill} block>
                智能预填其它信息
              </Button>

              <Form layout="vertical" form={detailForm} onFinish={handleFinish}>
                <Form.Item
                  label="菜品名称"
                  name="name"
                  rules={[{ required: true, message: '请输入菜品名称' }]}
                >
                  <Input placeholder="菜品名称" />
                </Form.Item>
                <Form.Item
                  label="分类"
                  name="category"
                  rules={[{ required: true, message: '请选择分类' }]}
                >
                  <Select options={CATEGORY_OPTIONS.map((item) => ({ value: item, label: item }))} />
                </Form.Item>
                <Form.Item
                  label="食用温度"
                  name="servingTemperature"
                  rules={[{ required: true, message: '请选择食用温度' }]}
                >
                  <Select options={TEMPERATURE_OPTIONS.map((item) => ({ value: item, label: item }))} />
                </Form.Item>
                <Form.Item
                  label="热量"
                  name="calories"
                  rules={[{ required: true, message: '请输入热量' }]}
                >
                  <InputNumber min={1} max={1000} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="标签" name="tags">
                  <Select
                    mode="tags"
                    tokenSeparators={[',', '，']}
                    placeholder="可继续补充或删除标签"
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  block
                  disabled={!suggestionReady}
                >
                  确认新增到菜品库
                </Button>
              </Form>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card title={`共 ${filteredDishes.length} 道菜`}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredDishes}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              scroll={{ x: 820 }}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
